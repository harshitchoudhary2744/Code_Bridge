"""
Empirical Evaluation Pipeline for CodeBridge.

Compares:
1. Baseline: Code -> Transformer -> Code
2. Structural: Code + Structure -> Transformer -> Code
3. Structural + Validation: Code + Structure -> Transformer -> Code -> Validator (+ 1 Correction Attempt)

Measures actual empirical syntax/compilation pass rates on test data.
Never invents metrics or fabricates numbers.
"""

import json
import os
import sys
from typing import Dict, List
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Add backend to path for validator, structure, and corrector services
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from app.services.structure import extract_structure
from app.services.validator import validate_code
from app.services.corrector import attempt_correction
from preprocess import load_jsonl


def run_evaluation(
    model_path: str = "Salesforce/codet5-small",
    test_path: str = "ml/data/test.jsonl",
    output_path: str = "ml/evaluation_results.json"
):
    print("=" * 65)
    print("CodeBridge Research Evaluation: Baseline vs Structural vs Validated")
    print("=" * 65)

    test_samples = load_jsonl(test_path)
    total_samples = len(test_samples)
    print(f"Loaded {total_samples} test cases from {test_path}")

    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"Loading model from: {model_path} on {device}...")
    tokenizer = AutoTokenizer.from_pretrained(model_path)
    model = AutoModelForSeq2SeqLM.from_pretrained(model_path).to(device)
    model.eval()

    modes = ["Baseline", "Structural", "Structural + Validation"]
    results = {
        m: {
            "total": total_samples,
            "compilation_passed": 0,
            "exact_matches": 0,
            "details": []
        }
        for m in modes
    }

    for idx, sample in enumerate(test_samples, 1):
        src_lang = sample["source_language"]
        tgt_lang = sample["target_language"]
        src_code = sample["source"].strip()
        ground_truth = sample["target"].strip()

        header = f"translate {src_lang} to {tgt_lang}:"

        # --- 1. Baseline Mode ---
        base_prompt = f"{header}\n{src_code}"
        base_out = _generate(base_prompt, tokenizer, model, device)
        base_val = validate_code(base_out, tgt_lang)
        if base_val.syntax and base_val.compilation:
            results["Baseline"]["compilation_passed"] += 1
        if base_out.strip() == ground_truth:
            results["Baseline"]["exact_matches"] += 1
        results["Baseline"]["details"].append({
            "sample_id": idx,
            "output": base_out,
            "valid": bool(base_val.syntax and base_val.compilation)
        })

        # --- 2. Structural Mode ---
        struct_tokens = extract_structure(src_code, src_lang)
        struct_str = "\n".join(struct_tokens)
        struct_prompt = f"{header}\n[STRUCTURE]\n{struct_str}\n[CODE]\n{src_code}"
        struct_out = _generate(struct_prompt, tokenizer, model, device)
        struct_val = validate_code(struct_out, tgt_lang)
        if struct_val.syntax and struct_val.compilation:
            results["Structural"]["compilation_passed"] += 1
        if struct_out.strip() == ground_truth:
            results["Structural"]["exact_matches"] += 1
        results["Structural"]["details"].append({
            "sample_id": idx,
            "output": struct_out,
            "valid": bool(struct_val.syntax and struct_val.compilation)
        })

        # --- 3. Structural + Validation Mode (with 1 correction attempt) ---
        sv_out = struct_out
        sv_val = struct_val
        corr_attempted = False
        if not (sv_val.syntax and sv_val.compilation) and sv_val.error_details:
            corr_attempted = True
            corr_code, new_val, _ = attempt_correction(
                source_code=src_code,
                source_language=src_lang,
                target_language=tgt_lang,
                failed_code=sv_out,
                validation_error=sv_val.error_details,
                structure=struct_tokens
            )
            sv_out = corr_code
            sv_val = new_val

        if sv_val.syntax and sv_val.compilation:
            results["Structural + Validation"]["compilation_passed"] += 1
        if sv_out.strip() == ground_truth:
            results["Structural + Validation"]["exact_matches"] += 1
        results["Structural + Validation"]["details"].append({
            "sample_id": idx,
            "output": sv_out,
            "valid": bool(sv_val.syntax and sv_val.compilation),
            "correction_attempted": corr_attempted
        })

    # Summary Output
    print("\n" + "=" * 70)
    print(f"{'System Pipeline':<26} | {'Samples':<8} | {'Syntax/Comp Pass':<18} | {'Pass Rate'}")
    print("-" * 70)
    for m in modes:
        passed = results[m]["compilation_passed"]
        rate = (passed / total_samples) * 100 if total_samples > 0 else 0
        print(f"{m:<26} | {total_samples:<8} | {passed}/{total_samples:<16} | {rate:.1f}%")
    print("=" * 70)

    # Save empirical results
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    print(f"\nEmpirical evaluation results saved to: {output_path}")


def _generate(prompt: str, tokenizer, model, device: str) -> str:
    inputs = tokenizer(prompt, return_tensors="pt", max_length=512, truncation=True).to(device)
    with torch.no_grad():
        out = model.generate(
            **inputs,
            max_length=256,
            num_beams=3,
            early_stopping=True,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id
        )
    return tokenizer.decode(out[0], skip_special_tokens=True).strip()


if __name__ == "__main__":
    model = "models/codet5_translation" if os.path.exists("models/codet5_translation/config.json") else "Salesforce/codet5-small"
    run_evaluation(model_path=model)
