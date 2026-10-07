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


import os
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

# Serve built React frontend if frontend/dist exists (unified single-service Render deployment)
FRONTEND_DIST = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")
)
if not (os.path.exists(FRONTEND_DIST) and os.path.exists(os.path.join(FRONTEND_DIST, "index.html"))):
    alt_dist = os.path.abspath(os.path.join(os.getcwd(), "frontend", "dist"))
    if os.path.exists(alt_dist) and os.path.exists(os.path.join(alt_dist, "index.html")):
        FRONTEND_DIST = alt_dist

if os.path.exists(FRONTEND_DIST) and os.path.exists(os.path.join(FRONTEND_DIST, "index.html")):
    assets_dir = os.path.join(FRONTEND_DIST, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/")
    def serve_root():
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        # Don't intercept API routes (they are handled by translate_router above)
        if full_path.startswith("api/"):
            return {"error": "API route not found"}
        target_file = os.path.join(FRONTEND_DIST, full_path)
        if os.path.exists(target_file) and os.path.isfile(target_file):
            return FileResponse(target_file)
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def root():
        return {
            "message": "Welcome to CodeBridge API. Visit /docs for OpenAPI documentation or /api/health for system status."
        }
