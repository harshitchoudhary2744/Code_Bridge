"""
Translation Service using Salesforce/codet5-small (Encoder-Decoder Transformer).

Responsible for:
1. Loading and caching CodeT5 tokenizer and model in memory
2. Constructing model prompts for Baseline and Structural modes
3. Generating target sequence using beam search / seq2seq decoding
4. Post-processing and cleaning generated code
"""

import os
from typing import List, Optional, Tuple
import torch
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM

# Global in-memory cache for the loaded model and tokenizer
_CACHED_TOKENIZER = None
_CACHED_MODEL = None
_ACTIVE_MODEL_PATH = "Salesforce/codet5-small"
_DEVICE = "cuda" if torch.cuda.is_available() else "cpu"

BASE_MODEL_NAME = "Salesforce/codet5-small"
FINE_TUNED_MODEL_DIR = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "..", "models", "codet5_translation")
)


def load_model_and_tokenizer(custom_path: Optional[str] = None):
    """
    Loads and caches tokenizer and Seq2Seq model into memory.
    Prefers fine-tuned checkpoint in models/codet5_translation if available,
    otherwise loads baseline Salesforce/codet5-small.
    """
    global _CACHED_TOKENIZER, _CACHED_MODEL, _ACTIVE_MODEL_PATH

    model_source = custom_path

    if not model_source:
        # Check if fine-tuned checkpoint and weights exist
        has_weights = os.path.exists(os.path.join(FINE_TUNED_MODEL_DIR, "model.safetensors")) or os.path.exists(os.path.join(FINE_TUNED_MODEL_DIR, "pytorch_model.bin"))
        if os.path.exists(FINE_TUNED_MODEL_DIR) and has_weights:
            model_source = FINE_TUNED_MODEL_DIR
            _ACTIVE_MODEL_PATH = "Fine-Tuned CodeBridge (models/codet5_translation)"
        else:
            model_source = BASE_MODEL_NAME
            _ACTIVE_MODEL_PATH = f"Pretrained Base ({BASE_MODEL_NAME})"

    if _CACHED_TOKENIZER is None or _CACHED_MODEL is None:
        print(f"[Translator] Loading tokenizer and model from {model_source} on device {_DEVICE}...")
        _CACHED_TOKENIZER = AutoTokenizer.from_pretrained(model_source)
        _CACHED_MODEL = AutoModelForSeq2SeqLM.from_pretrained(model_source).to(_DEVICE)
        _CACHED_MODEL.eval()
        print(f"[Translator] Model successfully loaded and ready.")

    return _CACHED_TOKENIZER, _CACHED_MODEL


def build_model_input(
    source_code: str,
    source_language: str,
    target_language: str,
    structure: Optional[List[str]] = None,
    experiment_mode: str = "structural_validation",
) -> str:
    """
    Constructs the sequence-to-sequence prompt for CodeT5.
    
    Baseline mode:
        translate python to java:
        <code>
        
    Structural mode:
        translate python to java:
        [STRUCTURE]
        FUNCTION
        PARAMETER
        RETURN
        [CODE]
        <code>
    """
    src = source_language.lower().strip()
    tgt = target_language.lower().strip()
    clean_code = source_code.strip()

    header = f"translate {src} to {tgt}:"

    # Baseline mode: No structure information
    if experiment_mode == "baseline" or not structure:
        return f"{header}\n{clean_code}"

    # Structural mode
    struct_str = "\n".join(structure)
    return f"{header}\n[STRUCTURE]\n{struct_str}\n[CODE]\n{clean_code}"


def translate_code(
    source_code: str,
    source_language: str,
    target_language: str,
    structure: Optional[List[str]] = None,
    experiment_mode: str = "structural_validation",
    max_length: int = 256,
) -> Tuple[str, str]:
    """
    Translates source code into target language using CodeT5.
    
    Returns:
        (translated_code, model_name)
    """
    if not source_code or not source_code.strip():
        return "", _ACTIVE_MODEL_PATH

    tokenizer, model = load_model_and_tokenizer()

    prompt = build_model_input(
        source_code=source_code,
        source_language=source_language,
        target_language=target_language,
        structure=structure,
        experiment_mode=experiment_mode,
    )

    inputs = tokenizer(
        prompt,
        return_tensors="pt",
        max_length=512,
        truncation=True,
        padding=False,
    ).to(_DEVICE)

    with torch.no_grad():
        outputs = model.generate(
            **inputs,
            max_length=max_length,
            num_beams=3,
            early_stopping=True,
            no_repeat_ngram_size=2,
            pad_token_id=tokenizer.pad_token_id,
            eos_token_id=tokenizer.eos_token_id,
        )

    raw_output = tokenizer.decode(outputs[0], skip_special_tokens=True)
    clean_code = _post_process_translation(raw_output, target_language)

    return clean_code, _ACTIVE_MODEL_PATH


def _post_process_translation(generated_text: str, target_language: str) -> str:
    """
    Cleans model output:
    - Removes hallucinated prompt echoes or markdown code blocks
    - Filters out prompt headers like [STRUCTURE], [CODE], [FAILED_CODE], [ERROR]
    - Formats indentation and class structure for target language
    """
    text = generated_text.strip()

    # Remove markdown code fences if model generated them
    if text.startswith("```"):
        lines = text.splitlines()
        if len(lines) > 2 and lines[-1].startswith("```"):
            text = "\n".join(lines[1:-1]).strip()
        elif len(lines) > 1:
            text = "\n".join(lines[1:]).strip()

    # Strip out any prompt headers if echoed by model
    prompt_headers = [
        "translate python to java:",
        "translate java to python:",
        "fix java translation error:",
        "fix python translation error:",
        "[STRUCTURE]",
        "[CODE]",
        "[SOURCE]",
        "[FAILED_CODE]",
        "[ERROR]"
    ]
    for ph in prompt_headers:
        if ph in text:
            # Take only the portion before or after, or split
            parts = text.split(ph)
            text = parts[0].strip() if parts[0].strip() else parts[-1].strip()

    # Clean target Java code wrapper if incomplete
    target = target_language.lower()
    if target == "java":
        if "class " not in text and ("public " in text or "static " in text or "int " in text or "void " in text):
            open_b = text.count("{")
            close_b = text.count("}")
            if open_b > close_b:
                text += "\n" + ("}" * (open_b - close_b))

    return text.strip()
