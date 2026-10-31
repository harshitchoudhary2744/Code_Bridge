import os
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .schemas import ValidationRequest, ValidationResponse
from .validators.differential import DifferentialEvaluator

app = FastAPI(
    title="TransCode Lab — Execution & Validation Runner",
    description="Isolated syntax, compilation, and differential test validation service",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

evaluator = DifferentialEvaluator()

@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "transcode-execution-runner",
        "sandboxMode": os.getenv("SANDBOX_MODE", "restricted_local")
    }

@app.get("/ready")
def readiness():
    import shutil
    has_javac = shutil.which("javac") is not None
    has_java = shutil.which("java") is not None
    has_python = shutil.which("python") is not None

    return {
        "status": "ready" if (has_javac and has_java and has_python) else "degraded",
        "runtimes": {
            "python": has_python,
            "javac": has_javac,
            "java": has_java
        }
    }

@app.post("/api/v1/validate", response_model=ValidationResponse)
def validate(req: ValidationRequest):
    return evaluator.evaluate(req)

if __name__ == "__main__":
    port = int(os.getenv("EXECUTION_RUNNER_PORT", "5000"))
    uvicorn.run("services.execution-runner.src.main:app", host="0.0.0.0", port=port, reload=False)

