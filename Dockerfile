# CodeBridge Backend Dockerfile for Render Deployment
FROM python:3.11-slim

# Prevent Python from writing .pyc files and buffer stdout
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DEBIAN_FRONTEND=noninteractive

# Install OpenJDK 17 (for javac Java compilation validation) and essentials
RUN apt-get update && apt-get install -y --no-install-recommends \
    openjdk-17-jdk-headless \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy dependency requirements
COPY backend/requirements.txt ./backend/requirements.txt

# Install PyTorch CPU first (compact size ~150MB, fast build, low memory)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r backend/requirements.txt

# Copy source code and reference datasets
COPY backend/ ./backend/
COPY models/ ./models/
COPY samples/ ./samples/
COPY ml/ ./ml/

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:${PORT:-8000}/api/health || exit 1

EXPOSE 8000

# Launch Uvicorn dynamically binding to Render's $PORT
CMD ["sh", "-c", "uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
