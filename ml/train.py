"""
Fine-Tuning Pipeline for Salesforce/codet5-small on Aligned Code Translation.

Trains an Encoder-Decoder Transformer to translate between Python and Java
using sequence-to-sequence supervised cross-entropy loss.
"""

import argparse
import os
import sys
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Add ml and backend to path
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
from preprocess import load_jsonl, format_sample


class CodeTranslationDataset(Dataset):
    """PyTorch Dataset for Seq2Seq Code Translation."""

    def __init__(self, data_path: str, tokenizer, use_structure: bool = False, max_src: int = 256, max_tgt: int = 256):
        self.raw_data = load_jsonl(data_path)
        self.tokenizer = tokenizer
        self.use_structure = use_structure
        self.max_src = max_src
        self.max_tgt = max_tgt

    def __len__(self):
        return len(self.raw_data)

    def __getitem__(self, idx):
        sample = self.raw_data[idx]
        formatted = format_sample(sample, use_structure=self.use_structure)

        src_encoding = self.tokenizer(
            formatted["input_text"],
            max_length=self.max_src,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )

        tgt_encoding = self.tokenizer(
            formatted["target_text"],
            max_length=self.max_tgt,
            padding="max_length",
            truncation=True,
            return_tensors="pt"
        )

        labels = tgt_encoding.input_ids.squeeze(0)
        # Replace padding token id with -100 so it is ignored by CrossEntropyLoss
        labels[labels == self.tokenizer.pad_token_id] = -100

        return {
            "input_ids": src_encoding.input_ids.squeeze(0),
            "attention_mask": src_encoding.attention_mask.squeeze(0),
            "labels": labels
        }


def train_model(
    model_name: str = "Salesforce/codet5-small",
    epochs: int = 5,
    batch_size: int = 4,
    lr: float = 5e-5,
    use_structure: bool = True,
    output_dir: str = "models/codet5_translation"
):
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"=== CodeBridge Fine-Tuning Pipeline ===")
    print(f"Device: {device}")
    print(f"Base Model: {model_name}")
    print(f"Epochs: {epochs} | Batch Size: {batch_size} | Learning Rate: {lr}")
    print(f"Structural Context: {'Enabled' if use_structure else 'Disabled'}")

    # 1. Load Tokenizer & Model
    print("\nLoading pretrained tokenizer and model...")
    tokenizer = AutoTokenizer.from_pretrained(model_name)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_name).to(device)

    # 2. Datasets
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    train_path = os.path.join(data_dir, "train.jsonl")
    val_path = os.path.join(data_dir, "validation.jsonl")

    train_dataset = CodeTranslationDataset(train_path, tokenizer, use_structure=use_structure)
    val_dataset = CodeTranslationDataset(val_path, tokenizer, use_structure=use_structure)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, shuffle=True)
    val_loader = DataLoader(val_dataset, batch_size=batch_size)

    print(f"Loaded {len(train_dataset)} training pairs and {len(val_dataset)} validation pairs.")

    optimizer = torch.optim.AdamW(model.parameters(), lr=lr)

    # 3. Training Loop
    model.train()
    for epoch in range(1, epochs + 1):
        total_loss = 0.0
        for batch_idx, batch in enumerate(train_loader):
            optimizer.zero_grad()

            input_ids = batch["input_ids"].to(device)
            attention_mask = batch["attention_mask"].to(device)
            labels = batch["labels"].to(device)

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels
            )

            loss = outputs.loss
            loss.backward()
            optimizer.step()

            total_loss += loss.item()

        avg_loss = total_loss / max(1, len(train_loader))

        # Quick validation loss
        model.eval()
        val_loss = 0.0
        with torch.no_grad():
            for val_batch in val_loader:
                v_inputs = val_batch["input_ids"].to(device)
                v_mask = val_batch["attention_mask"].to(device)
                v_labels = val_batch["labels"].to(device)
                v_out = model(input_ids=v_inputs, attention_mask=v_mask, labels=v_labels)
                val_loss += v_out.loss.item()
        avg_val_loss = val_loss / max(1, len(val_loader))
        model.train()

        print(f"Epoch {epoch}/{epochs} | Train Loss: {avg_loss:.4f} | Val Loss: {avg_val_loss:.4f}")

    # 4. Save Checkpoint
    os.makedirs(output_dir, exist_ok=True)
    print(f"\nSaving fine-tuned model checkpoint to {output_dir}...")
    model.save_pretrained(output_dir)
    tokenizer.save_pretrained(output_dir)
    print("Fine-tuning completed successfully!")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune CodeT5 on code translation pairs.")
    parser.add_argument("--epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=4, help="Batch size")
    parser.add_argument("--lr", type=float, default=5e-5, help="Learning rate")
    parser.add_argument("--use_structure", action="store_true", default=True, help="Include Tree-sitter structure")
    parser.add_argument("--output_dir", type=str, default="models/codet5_translation", help="Directory to save checkpoint")

    args = parser.parse_args()
    train_model(
        epochs=args.epochs,
        batch_size=args.batch_size,
        lr=args.lr,
        use_structure=args.use_structure,
        output_dir=args.output_dir
    )
