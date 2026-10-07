"""
Correction Service for CodeBridge.

Implements ONE automatic correction attempt when generated code fails validation.
Feeds the source code, erroneous generated code, and the specific compiler/syntax error back to the model.
"""

from typing import Any, Dict, List, Optional, Tuple
import torch
from .translator import load_model_and_tokenizer, _post_process_translation, _DEVICE
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
    tokenizer, model = load_model_and_tokenizer()

    src = source_language.lower().strip()
    tgt = target_language.lower().strip()

    # Build concise correction prompt for CodeT5
    prompt = (
        f"fix {tgt} translation error:\n"
        f"[SOURCE]\n{source_code.strip()}\n"
        f"[FAILED_CODE]\n{failed_code.strip()}\n"
        f"[ERROR]\n{validation_error.strip()[:200]}"
    )

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        max_length=512,
        truncation=True,
    ).to(_DEVICE)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=256,
            num_beams=3,
            early_stopping=True,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    raw_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
    corrected_code = _post_process_translation(raw_output, target_language)

    # If the model produced empty or identical string, apply targeted heuristic cleanup
    # (e.g. if javac error was missing semicolon or missing class wrapper)
    if not corrected_code or corrected_code == failed_code.strip():
        corrected_code = _heuristic_repair(failed_code, target_language, validation_error)

    # Re-validate the newly generated code
    new_validation = validate_code(corrected_code, target_language, tests)

    metadata = {
        "attempt_count": 1,
        "initial_error": validation_error,
        "prompt_used": prompt,
        "status": "PASSED" if new_validation.syntax and new_validation.compilation else "FAILED"
    }

    return corrected_code, new_validation, metadata


def _heuristic_repair(code: str, target_language: str, error_msg: str) -> str:
    """
    Lightweight rule-based syntax repair for common small compiler issues (e.g., missing semicolons).
    """
    repaired = code
    if target_language.lower() == "java":
        if "';' expected" in error_msg:
            # Add missing semicolon to lines that look like statements
            lines = repaired.splitlines()
            new_lines = []
            for l in lines:
                stripped = l.rstrip()
                if (
                    stripped
                    and not stripped.endswith(";")
                    and not stripped.endswith("{")
                    and not stripped.endswith("}")
                    and not stripped.startswith("//")
                ):
                    new_lines.append(stripped + ";")
                else:
                    new_lines.append(l)
            repaired = "\n".join(new_lines)
    return repaired
