"""
TransCode Lab — Reproducible Sequence-to-Sequence Code Translation Fine-Tuning Script
Supports Salesforce CodeT5 and UCLA/Columbia PLBART on parallel Python <-> Java data.
"""

import os
import json
import time
import argparse
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import (
    AutoTokenizer,
    AutoModelForSeq2SeqLM,
    PLBartTokenizer,
    PLBartForConditionalGeneration,
    get_linear_schedule_with_warmup
)
from torch.optim import AdamW

class ParallelCodeDataset(Dataset):
    def __init__(self, data, tokenizer, src_lang="python", tgt_lang="java", max_len=256):
        self.data = data
        self.tokenizer = tokenizer
        self.src_lang = src_lang
        self.tgt_lang = tgt_lang
        self.max_len = max_len

    def __len__(self):
        return len(self.data)

    def __getitem__(self, idx):
        item = self.data[idx]
        src_code = item["source"]
        tgt_code = item["target"]

        # Check if tokenizer is PLBartTokenizer
        if isinstance(self.tokenizer, PLBartTokenizer):
            self.tokenizer.src_lang = f"__{self.src_lang}__"
            self.tokenizer.tgt_lang = f"__{self.tgt_lang}__"
            inputs = self.tokenizer(src_code, max_length=self.max_len, padding="max_length", truncation=True, return_tensors="pt")
            with self.tokenizer.as_target_tokenizer():
                labels = self.tokenizer(tgt_code, max_length=self.max_len, padding="max_length", truncation=True, return_tensors="pt")
        else:
            # CodeT5 prefix formatting
            prompt = f"translate {self.src_lang.capitalize()} to {self.tgt_lang.capitalize()}: {src_code}"
            inputs = self.tokenizer(prompt, max_length=self.max_len, padding="max_length", truncation=True, return_tensors="pt")
            labels = self.tokenizer(tgt_code, max_length=self.max_len, padding="max_length", truncation=True, return_tensors="pt")

        input_ids = inputs["input_ids"].squeeze(0)
        attention_mask = inputs["attention_mask"].squeeze(0)
        label_ids = labels["input_ids"].squeeze(0)
        # Replace padding token id with -100 so loss ignores padding
        label_ids[label_ids == self.tokenizer.pad_token_id] = -100

        return {
            "input_ids": input_ids,
            "attention_mask": attention_mask,
            "labels": label_ids
        }

def train(args):
    print(f"\n=======================================================")
    print(f"TransCode Lab Fine-Tuning Pipeline")
    print(f"Model: {args.model_name_or_path}")
    print(f"Direction: {args.source_lang} -> {args.target_lang}")
    print(f"Device: {args.device}")
    print(f"=======================================================\n")

    torch.manual_seed(args.seed)

    # 1. Load Tokenizer & Model
    print("[1/5] Loading tokenizer and model checkpoint...")
    is_plbart = "plbart" in args.model_name_or_path.lower()

    if is_plbart:
        tokenizer = PLBartTokenizer.from_pretrained(args.model_name_or_path)
        model = PLBartForConditionalGeneration.from_pretrained(args.model_name_or_path)
    else:
        tokenizer = AutoTokenizer.from_pretrained(args.model_name_or_path)
        model = AutoModelForSeq2SeqLM.from_pretrained(args.model_name_or_path)

    model.to(args.device)

    # 2. Prepare Data
    print("[2/5] Preparing training and validation data...")
    if args.smoke_test:
        print("  [SMOKE TEST MODE] Using synthetic training samples for rapid verification.")
        train_data = [
            {"source": "def add(a: int, b: int) -> int:\n    return a + b", "target": "public static int add(int a, int b) { return a + b; }"},
            {"source": "def sub(a: int, b: int) -> int:\n    return a - b", "target": "public static int sub(int a, int b) { return a - b; }"}
        ]
        val_data = [
            {"source": "def mult(a: int, b: int) -> int:\n    return a * b", "target": "public static int mult(int a, int b) { return a * b; }"}
        ]
    else:
        with open(args.train_file, "r", encoding="utf-8") as f:
            train_data = json.load(f)
        with open(args.val_file, "r", encoding="utf-8") as f:
            val_data = json.load(f)

    train_ds = ParallelCodeDataset(train_data, tokenizer, args.source_lang, args.target_lang, args.max_len)
    val_ds = ParallelCodeDataset(val_data, tokenizer, args.source_lang, args.target_lang, args.max_len)

    train_loader = DataLoader(train_ds, batch_size=args.batch_size, shuffle=True)
    val_loader = DataLoader(val_ds, batch_size=args.batch_size)

    # 3. Optimizer & Scheduler
    print("[3/5] Initializing AdamW optimizer and linear scheduler...")
    optimizer = AdamW(model.parameters(), lr=args.learning_rate, weight_decay=0.01)
    total_steps = len(train_loader) * args.epochs
    scheduler = get_linear_schedule_with_warmup(optimizer, num_warmup_steps=args.warmup_steps, num_training_steps=total_steps)

    # 4. Training Loop
    print(f"[4/5] Executing {args.epochs} training epoch(s)...")
    start_time = time.time()

    for epoch in range(1, args.epochs + 1):
        model.train()
        epoch_loss = 0.0

        for step, batch in enumerate(train_loader):
            optimizer.zero_grad()
            input_ids = batch["input_ids"].to(args.device)
            attention_mask = batch["attention_mask"].to(args.device)
            labels = batch["labels"].to(args.device)

            outputs = model(input_ids=input_ids, attention_mask=attention_mask, labels=labels)
            loss = outputs.loss
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            optimizer.step()
            scheduler.step()

            epoch_loss += loss.item()

        avg_loss = epoch_loss / max(len(train_loader), 1)
        print(f"  Epoch {epoch}/{args.epochs} | Training Loss: {avg_loss:.4f}")

    total_duration = time.time() - start_time
    print(f"  Training finished in {total_duration:.2f} seconds.")

    # 5. Save Checkpoint & Metadata
    print(f"[5/5] Saving checkpoint and training metadata to {args.output_dir}...")
    os.makedirs(args.output_dir, exist_ok=True)
    model.save_pretrained(args.output_dir)
    tokenizer.save_pretrained(args.output_dir)

    metadata = {
        "parentModel": args.model_name_or_path,
        "sourceLanguage": args.source_lang,
        "targetLanguage": args.target_lang,
        "epochs": args.epochs,
        "learningRate": args.learning_rate,
        "batchSize": args.batch_size,
        "seed": args.seed,
        "device": args.device,
        "smokeTest": args.smoke_test,
        "trainingDurationSeconds": round(total_duration, 2),
        "savedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ")
    }

    with open(os.path.join(args.output_dir, "training_metadata.json"), "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    print(f"[Done] Checkpoint saved successfully: {args.output_dir}\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="TransCode Lab Seq2Seq Code Translation Fine-Tuning")
    parser.add_argument("--model_name_or_path", default="Salesforce/codet5-small")
    parser.add_argument("--train_file", default="ml/data/train.json")
    parser.add_argument("--val_file", default="ml/data/val.json")
    parser.add_argument("--source_lang", default="python")
    parser.add_argument("--target_lang", default="java")
    parser.add_argument("--output_dir", default="checkpoints/codet5-small-finetuned")
    parser.add_argument("--learning_rate", type=float, default=5e-5)
    parser.add_argument("--batch_size", type=int, default=2)
    parser.add_argument("--epochs", type=int, default=1)
    parser.add_argument("--warmup_steps", type=int, default=0)
    parser.add_argument("--max_len", type=int, default=128)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--device", default="cpu")
    parser.add_argument("--smoke_test", action="store_true", help="Run 1-step CPU smoke test verification")

    args = parser.parse_args()
    train(args)

