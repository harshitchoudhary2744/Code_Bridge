"""
FastAPI application entry point for CodeBridge.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes.translate import router as translate_router

app = FastAPI(
    title="CodeBridge API",
    description="Automated Code Translation System using an Encoder-Decoder Transformer with Structure Extraction and Validation",
    version="1.0.0"
)

# Allow CORS for local Vite development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(translate_router)


@app.get("/")
def root():
    return {
        "message": "Welcome to CodeBridge API. Visit /docs for OpenAPI documentation or /api/health for system status."
    }
