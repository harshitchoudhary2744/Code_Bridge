import os
import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import (
    ModelMetadata,
    TranslateRequest,
    TranslateResponse,
    RepairRequest,
    RepairResponse
)
from .registry import ModelRegistry

registry = ModelRegistry()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: preload models on CPU/configured device
    device = os.getenv("DEFAULT_DEVICE", "cpu")
    print(f"[ModelService] Starting up with device={device}. Checking registered models...")
    # Lazy load on first request or load lightweight baseline
    yield
    print("[ModelService] Shutting down. Unloading model weights...")
    for adapter in registry.adapters.values():
        adapter.unload()

app = FastAPI(
    title="TransCode Lab — Model Inference Service",
    description="Multi-model sequence-to-sequence neural code translation and repair service",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "service": "transcode-model-service"}

@app.get("/ready")
def readiness():
    model_readiness = {}
    for model_id, adapter in registry.adapters.items():
        model_readiness[model_id] = adapter.health()
    return {
        "status": "ready",
        "models": model_readiness
    }

@app.get("/api/v1/models")
def list_models():
    return registry.list_models()

@app.get("/api/v1/models/{model_id}")
def get_model(model_id: str):
    meta = registry.get_metadata(model_id)
    if not meta:
        raise HTTPException(status_code=404, detail=f"Model '{model_id}' not found in registry")
    return meta

@app.post("/api/v1/translate", response_model=TranslateResponse)
async def translate(req: TranslateRequest):
    adapter = registry.get_model(req.modelId)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Model '{req.modelId}' not found in registry")

    meta = adapter.metadata()
    if meta.status != "AVAILABLE":
        return TranslateResponse(
            modelId=req.modelId,
            status="MODEL_UNAVAILABLE",
            candidateCode=None,
            generationTimeMs=0.0,
            generationConfig=req.generation.model_dump(),
            checkpointRevision=meta.revision,
            deviceUsed=adapter.device,
            error=f"Model '{req.modelId}' has status '{meta.status}' and cannot run inference."
        )

    async with registry.concurrency_semaphore:
        return adapter.translate(
            source_code=req.sourceCode,
            source_language=req.sourceLanguage,
            target_language=req.targetLanguage,
            generation_config=req.generation
        )

@app.post("/api/v1/repair", response_model=RepairResponse)
async def repair(req: RepairRequest):
    adapter = registry.get_model(req.modelId)
    if not adapter:
        raise HTTPException(status_code=404, detail=f"Model '{req.modelId}' not found in registry")

    meta = adapter.metadata()
    if meta.status != "AVAILABLE":
        return RepairResponse(
            modelId=req.modelId,
            status="MODEL_UNAVAILABLE",
            candidateCode=None,
            generationTimeMs=0.0,
            feedbackPayloadUsed="",
            error=f"Model '{req.modelId}' has status '{meta.status}' and cannot perform repair."
        )

    async with registry.concurrency_semaphore:
        return adapter.repair(
            source_code=req.sourceCode,
            source_language=req.sourceLanguage,
            target_language=req.targetLanguage,
            previous_candidate=req.previousCandidate,
            diagnostics=req.compilerDiagnostics,
            failing_input=req.failingTestInput,
            expected_output=req.expectedOutput,
            actual_output=req.actualOutput,
            generation_config=req.generation
        )

if __name__ == "__main__":
    port = int(os.getenv("MODEL_SERVICE_PORT", "8000"))
    uvicorn.run("services.model-service.src.main:app", host="0.0.0.0", port=port, reload=False)
