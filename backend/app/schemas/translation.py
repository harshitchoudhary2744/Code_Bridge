from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class TestCase(BaseModel):
    function: Optional[str] = None
    inputs: List[Any] = Field(default_factory=list)
    expected: Any = None


class TranslationRequest(BaseModel):
    source_language: str = Field(..., description="Source code language ('python' or 'java')")
    target_language: str = Field(..., description="Target code language ('python' or 'java')")
    code: str = Field(..., description="Source code to translate")
    use_structure: bool = Field(True, description="Whether to include lightweight structural summary")
    run_validation: bool = Field(True, description="Whether to validate generated code syntax/compilation")
    tests: List[Dict[str, Any]] = Field(default_factory=list, description="Optional unit test cases")
    experiment_mode: Optional[str] = Field("structural_validation", description="baseline, structural, or structural_validation")


class ValidationResult(BaseModel):
    syntax: bool = True
    compilation: bool = True
    tests_passed: int = 0
    tests_total: int = 0
    status: str = "valid"  # "valid", "invalid", "needs_correction", "skipped", "error"
    message: str = "Generated code passed validation."
    error_details: Optional[str] = None
    test_details: Optional[List[Dict[str, Any]]] = None


class TranslationResponse(BaseModel):
    translated_code: str
    source_language: str
    target_language: str
    structure_used: bool = False
    extracted_structure: Optional[List[str]] = None
    validation: Optional[ValidationResult] = None
    correction_attempted: bool = False
    correction_details: Optional[Dict[str, Any]] = None
    experiment_mode: Optional[str] = None
    model_type: Optional[str] = "Salesforce/codet5-small"


class StructureAnalysisRequest(BaseModel):
    language: str
    code: str


class StructureAnalysisResponse(BaseModel):
    language: str
    structure: List[str]
    compact_text: str


class ManualValidationRequest(BaseModel):
    language: str
    code: str
    tests: List[Dict[str, Any]] = Field(default_factory=list)
