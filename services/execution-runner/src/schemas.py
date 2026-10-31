from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field

class EntryPoint(BaseModel):
    kind: str = "function"
    name: str
    className: Optional[str] = None

class TestCase(BaseModel):
    id: Optional[str] = None
    input: List[Any]
    expectedOutput: Optional[Any] = None
    isEdgeCase: Optional[bool] = False
    description: Optional[str] = None

class GateResult(BaseModel):
    gate: str
    passed: bool
    status: str
    message: Optional[str] = None
    diagnostics: Optional[str] = None
    durationMs: Optional[float] = None

class TestOutcome(BaseModel):
    testIndex: int
    input: List[Any]
    expectedOutput: Optional[Any] = None
    actualOutput: Optional[Any] = None
    passed: bool
    outcome: str
    executionTimeMs: Optional[float] = None
    errorMessage: Optional[str] = None

class ValidationRequest(BaseModel):
    sourceLanguage: str
    sourceVersion: str = "3.11"
    targetLanguage: str
    targetVersion: str = "17"
    sourceCode: str
    candidateCode: Optional[str] = None
    entryPoint: EntryPoint
    tests: List[TestCase] = Field(default_factory=list)
    timeoutSeconds: float = 5.0
    sandboxMode: str = "auto"

class ValidationResponse(BaseModel):
    overallStatus: str
    passed: bool
    gates: List[GateResult]
    testResults: List[TestOutcome]
    passedTestsCount: int
    totalTestsCount: int
    compilerDiagnostics: Optional[str] = None
    runtimeDiagnostics: Optional[str] = None
    failureCategory: Optional[str] = None
    sandboxStatus: str

