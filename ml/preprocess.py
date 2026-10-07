"""
Dataset Preprocessing Pipeline for CodeBridge.

Loads aligned code translation pairs from JSONL files, extracts Tree-sitter
structural tokens, and formats sequences for Seq2Seq learning with CodeT5.
"""

import json
import os
import sys
from typing import Dict, List, Optional
from transformers import AutoTokenizer

# Include backend path to access structure extractor
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.services.structure import extract_structure


def load_jsonl(filepath: str) -> List[Dict[str, str]]:
    """Loads a JSONL file into a list of dictionaries."""
    data = []
    if not os.path.exists(filepath):
        print(f"[Warning] File not found: {filepath}")
        return data

    with open(filepath, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                data.append(json.loads(line))
    return data


def format_sample(
    sample: Dict[str, str],
    use_structure: bool = False,
    tokenizer: Optional[AutoTokenizer] = None,
    max_source_len: int = 512,
    max_target_len: int = 256,
) -> Dict[str, str]:
    """
    Formats a single source-target pair into model prompt and target text.
    """
    src_lang = sample["source_language"]
    tgt_lang = sample["target_language"]
    src_code = sample["source"].strip()
    tgt_code = sample["target"].strip()

    header = f"translate {src_lang} to {tgt_lang}:"

    if use_structure:
        struct_tokens = extract_structure(src_code, src_lang)
        struct_str = "\n".join(struct_tokens)
        input_text = f"{header}\n[STRUCTURE]\n{struct_str}\n[CODE]\n{src_code}"
    else:
        input_text = f"{header}\n{src_code}"

    output = {
        "input_text": input_text,
        "target_text": tgt_code,
        "source_language": src_lang,
        "target_language": tgt_lang,
    }

    if tokenizer:
        tokenized_inputs = tokenizer(
            input_text,
            max_length=max_source_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        tokenized_targets = tokenizer(
            tgt_code,
            max_length=max_target_len,
            padding="max_length",
            truncation=True,
            return_tensors="pt",
        )
        output["input_ids"] = tokenized_inputs.input_ids.squeeze(0)
        output["attention_mask"] = tokenized_inputs.attention_mask.squeeze(0)
        output["labels"] = tokenized_targets.input_ids.squeeze(0)

    return output


def prepare_dataset(split: str = "train", use_structure: bool = False) -> List[Dict[str, str]]:
    """Loads and formats a dataset split ('train', 'validation', 'test')."""
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    path = os.path.join(data_dir, f"{split}.jsonl")
    raw_data = load_jsonl(path)
    return [format_sample(s, use_structure=use_structure) for s in raw_data]


if __name__ == "__main__":
    print("Testing dataset loading and preprocessing...")
    train_data = prepare_dataset("train", use_structure=True)
    print(f"Loaded {len(train_data)} training samples with structure.")
    if train_data:
        print("\n--- Example Preprocessed Prompt ---")
        print(train_data[0]["input_text"])
        print("\n--- Target Code ---")
        print(train_data[0]["target_text"])
