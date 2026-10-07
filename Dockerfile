# CodeBridge Fullstack Single-Stage Dockerfile for Render Production Deployment
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Install OpenJDK 17 headless (provides javac compiler for validation) and curl
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install PyTorch CPU first (small ~150MB footprint, fast download, no CUDA overhead)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install backend dependencies
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code, models, samples, datasets, and pre-built frontend
COPY backend/ ./backend/
COPY models/ ./models/
COPY samples/ ./samples/
COPY ml/ ./ml/
COPY frontend/dist/ ./frontend/dist/

EXPOSE 10000

# Container healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/api/health || exit 1

# Launch Uvicorn dynamically binding to Render's $PORT (default 10000)
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-10000}"]
