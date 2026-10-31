from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class GenerationConfig(BaseModel):
    maxNewTokens: int = Field(default=256, ge=16, le=2048)
    numBeams: int = Field(default=1, ge=1, le=10)
    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    topP: float = Field(default=0.95, ge=0.0, le=1.0)
    doSample: bool = False
    seed: Optional[int] = None

class ModelMetadata(BaseModel):
    id: str
    displayName: str
    publisher: str
    family: str
    architecture: str
    checkpoint: str
    revision: str
    tokenizer: str
    tokenizerClass: Optional[str] = None
    license: str
    licenseUrl: Optional[str] = ""
    paperUrl: Optional[str] = ""
    supportedTasks: List[str]
    supportedLanguages: List[str]
    parameterCount: Optional[int] = None
    deviceRequirements: Optional[Dict[str, Any]] = None
    status: str
    fineTuningStatus: str = "PRETRAINED_ONLY"
    limitations: List[str] = []

class TranslateRequest(BaseModel):
    modelId: str
    sourceLanguage: str
    targetLanguage: str
    sourceCode: str
    generation: GenerationConfig = Field(default_factory=GenerationConfig)

class TranslateResponse(BaseModel):
    modelId: str
    status: str
    candidateCode: Optional[str] = None
    generationTimeMs: float
    peakMemoryMb: Optional[float] = None
    generationConfig: Dict[str, Any]
    checkpointRevision: str
    deviceUsed: str
    error: Optional[str] = None

class RepairRequest(BaseModel):
    modelId: str
    sourceLanguage: str
    targetLanguage: str
    sourceCode: str
    previousCandidate: str
    compilerDiagnostics: Optional[str] = None
    failingTestInput: Optional[Any] = None
    expectedOutput: Optional[Any] = None
    actualOutput: Optional[Any] = None
    failureCategory: Optional[str] = None
    generation: GenerationConfig = Field(default_factory=GenerationConfig)

class RepairResponse(BaseModel):
    modelId: str
    status: str
    candidateCode: Optional[str] = None
    generationTimeMs: float
    feedbackPayloadUsed: str
    error: Optional[str] = None

