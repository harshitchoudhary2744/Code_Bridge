"""
API Routes for CodeBridge Translation, Structure Analysis, and Validation.
"""

from fastapi import APIRouter, HTTPException
from ..schemas.translation import (
    TranslationRequest,
    TranslationResponse,
    StructureAnalysisRequest,
    StructureAnalysisResponse,
    ManualValidationRequest,
    ValidationResult,
)
from ..services.structure import extract_structure, format_structure_text
from ..services.translator import translate_code
from ..services.validator import validate_code
from ..services.corrector import attempt_correction

router = APIRouter(prefix="/api", tags=["Code Translation"])

SUPPORTED_LANGUAGES = ["python", "java"]


@router.get("/health")
def health_check():
    """Returns the operational status of the CodeBridge service."""
    return {
        "status": "ok",
        "service": "CodeBridge Translation API",
        "supported_languages": SUPPORTED_LANGUAGES,
        "base_model": "Salesforce/codet5-small"
    }


@router.get("/languages")
def get_languages():
    """Returns supported source and target languages."""
    return {
        "languages": SUPPORTED_LANGUAGES,
        "directions": [
            {"source": "python", "target": "java"},
            {"source": "java", "target": "python"}
        ]
    }


@router.post("/analyze-structure", response_model=StructureAnalysisResponse)
def analyze_structure_endpoint(request: StructureAnalysisRequest):
    """Extracts lightweight structural categories using Tree-sitter."""
    lang = request.language.lower().strip()
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language '{request.language}'. Supported: {SUPPORTED_LANGUAGES}")

    structure = extract_structure(request.code, lang)
    return StructureAnalysisResponse(
        language=lang,
        structure=structure,
        compact_text=format_structure_text(structure)
    )


@router.post("/validate", response_model=ValidationResult)
def validate_endpoint(request: ManualValidationRequest):
    """Validates user-submitted code for syntax, compilation, and optional tests."""
    lang = request.language.lower().strip()
    if lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported language '{request.language}'. Supported: {SUPPORTED_LANGUAGES}")

    return validate_code(request.code, lang, request.tests)


@router.post("/translate", response_model=TranslationResponse)
def translate_endpoint(request: TranslationRequest):
    """
    Main Translation Orchestrator:
    1. Input validation
    2. Tree-sitter structure extraction
    3. Model input construction
    4. CodeT5 sequence-to-sequence translation
    5. Syntax / Compilation / Test validation
    6. If validation fails -> Exactly ONE automatic correction attempt
    7. Final JSON response
    """
    src_lang = request.source_language.lower().strip()
    tgt_lang = request.target_language.lower().strip()

    # 1. Input Validation
    if src_lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported source language '{request.source_language}'.")
    if tgt_lang not in SUPPORTED_LANGUAGES:
        raise HTTPException(status_code=400, detail=f"Unsupported target language '{request.target_language}'.")
    if src_lang == tgt_lang:
        raise HTTPException(status_code=400, detail="Source and target languages cannot be the same.")
    if not request.code or not request.code.strip():
        raise HTTPException(status_code=400, detail="Source code cannot be empty.")

    # 2. Structure Extraction (if enabled or requested)
    extracted_structure = None
    if request.use_structure:
        extracted_structure = extract_structure(request.code, src_lang)

    # 3. Model Generation
    mode = request.experiment_mode or ("structural" if request.use_structure else "baseline")
    translated_code, model_name = translate_code(
        source_code=request.code,
        source_language=src_lang,
        target_language=tgt_lang,
        structure=extracted_structure if request.use_structure else None,
        experiment_mode=mode
    )

    # 4. Validation (if requested)
    validation_result = None
    correction_attempted = False
    correction_details = None

    if request.run_validation:
        validation_result = validate_code(translated_code, tgt_lang, request.tests)

        # 5. One Correction Attempt if validation failed
        is_invalid = (
            not validation_result.syntax
            or not validation_result.compilation
            or validation_result.status in ("invalid", "needs_correction")
        )

        if is_invalid and validation_result.error_details:
            correction_attempted = True
            err_msg = validation_result.error_details

            corrected_code, new_val, corr_meta = attempt_correction(
                source_code=request.code,
                source_language=src_lang,
                target_language=tgt_lang,
                failed_code=translated_code,
                validation_error=err_msg,
                tests=request.tests,
                structure=extracted_structure
            )

            # Update if correction succeeded or changed
            translated_code = corrected_code
            validation_result = new_val
            correction_details = corr_meta

    return TranslationResponse(
        translated_code=translated_code,
        source_language=src_lang,
        target_language=tgt_lang,
        structure_used=bool(request.use_structure and extracted_structure),
        extracted_structure=extracted_structure,
        validation=validation_result,
        correction_attempted=correction_attempted,
        correction_details=correction_details,
        experiment_mode=mode,
        model_type=model_name
    )
