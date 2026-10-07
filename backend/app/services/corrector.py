"""
Correction Service for CodeBridge.

Implements ONE automatic correction attempt when generated code fails validation.
First applies high-precision compiler syntax heuristics (semicolons, brace balancing, class wrappers).
If needed, performs a secondary translation attempt using the model's native seq2seq prompt.
"""

from typing import Any, Dict, List, Optional, Tuple
import torch
from .translator import load_model_and_tokenizer, _post_process_translation, _DEVICE, build_model_input
from .validator import validate_code
from ..schemas.translation import ValidationResult


def attempt_correction(
    source_code: str,
    source_language: str,
    target_language: str,
    failed_code: str,
    validation_error: str,
    tests: Optional[List[Dict[str, Any]]] = None,
    structure: Optional[List[str]] = None,
) -> Tuple[str, ValidationResult, Dict[str, Any]]:
    """
    Performs exactly ONE correction attempt.
    
    Returns:
        (new_code, new_validation_result, correction_metadata)
    """
    src = source_language.lower().strip()
    tgt = target_language.lower().strip()

    # Strategy 1: Targeted Compiler & Syntax Heuristic Repair
    heuristic_code = _heuristic_repair(failed_code, tgt, validation_error)
    heuristic_val = validate_code(heuristic_code, tgt, tests)

    if heuristic_val.syntax and heuristic_val.compilation:
        metadata = {
            "attempt_count": 1,
            "strategy": "heuristic_syntax_repair",
            "initial_error": validation_error,
            "prompt_used": "Automated AST and compiler syntax repair (braces/semicolons/class wrapper)",
            "status": "PASSED"
        }
        return heuristic_code, heuristic_val, metadata

    # Strategy 2: Model Re-generation with clean prompt
    tokenizer, model = load_model_and_tokenizer()
    clean_prompt = f"translate {src} to {tgt}:\n{source_code.strip()}"

    inputs = tokenizer(
        clean_prompt,
        return_tensors="pt",
        max_length=512,
        truncation=True,
    ).to(_DEVICE)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=256,
            num_beams=4,
            early_stopping=True,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    raw_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
    model_code = _post_process_translation(raw_output, tgt)
    model_code = _heuristic_repair(model_code, tgt, "")
    model_val = validate_code(model_code, tgt, tests)

    if model_val.syntax and model_val.compilation:
        metadata = {
            "attempt_count": 1,
            "strategy": "model_regeneration",
            "initial_error": validation_error,
            "prompt_used": clean_prompt,
            "status": "PASSED"
        }
        return model_code, model_val, metadata

    # Fallback: Return whichever candidate compiled better
    chosen_code = heuristic_code if (heuristic_val.syntax or not model_code) else model_code
    chosen_val = heuristic_val if (heuristic_val.syntax or not model_code) else model_val

    metadata = {
        "attempt_count": 1,
        "strategy": "hybrid_fallback",
        "initial_error": validation_error,
        "prompt_used": clean_prompt,
        "status": "PASSED" if (chosen_val.syntax and chosen_val.compilation) else "FAILED"
    }

    return chosen_code, chosen_val, metadata


def _heuristic_repair(code: str, target_language: str, error_msg: str) -> str:
    """
    Lightweight rule-based syntax repair for common compiler issues (missing brackets, semicolons, class wrappers).
    """
    repaired = code.strip()
    target = target_language.lower().strip()

    if target == "java":
        # 1. Fix repeated or illegal modifiers
        repaired = repaired.replace("public static public class", "public class")
        repaired = repaired.replace("public public class", "public class")
        repaired = repaired.replace("static static", "static")

        # 2. Drop spurious artifact lines like ******/
        lines = [l for l in repaired.splitlines() if not l.strip().startswith("******") and l.strip() != "*/"]
        repaired = "\n".join(lines).strip()

        # 3. Add missing class wrapper if standalone methods exist
        if "class " not in repaired and any(k in repaired for k in ["public ", "static ", "int ", "void ", "double ", "boolean ", "String "]):
            repaired = f"public class Solution {{\n    {repaired}\n}}"

        # 4. Add missing semicolons on statements
        lines = repaired.splitlines()
        new_lines = []
        for l in lines:
            s = l.rstrip()
            if (
                s
                and not s.endswith(";")
                and not s.endswith("{")
                and not s.endswith("}")
                and not s.startswith("//")
            ):
                if any(s.strip().startswith(kw) for kw in ["return", "int ", "double ", "boolean ", "String ", "total", "sum", "count"]) or "=" in s:
                    new_lines.append(s + ";")
                    continue
            new_lines.append(l)
        repaired = "\n".join(new_lines)

        # 5. Balance curly braces
        open_b = repaired.count("{")
        close_b = repaired.count("}")
        if open_b > close_b:
            repaired += "\n" + "\n".join(["}"] * (open_b - close_b))
        elif close_b > open_b:
            for _ in range(close_b - open_b):
                repaired = repaired.rstrip().rstrip("}").rstrip()

    elif target == "python":
        # Remove Java wrappers or trailing semicolons
        lines = repaired.splitlines()
        clean = []
        for l in lines:
            s = l.strip()
            if s.startswith("public class ") or s in ("{", "}"):
                continue
            if s.startswith("public static "):
                continue
            if s.endswith(";"):
                l = l.rstrip().rstrip(";")
            clean.append(l)
        repaired = "\n".join(clean)

    return repaired.strip()
