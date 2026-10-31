# ==========================================
# Stage 1: Build TypeScript Packages & React Frontend
# ==========================================
FROM node:20-bookworm-slim AS build-stage

WORKDIR /app

# Install build tools for native addons (e.g. better-sqlite3)
RUN apt-get update && apt-get install -y --no-install-recommends python3 make g++ && rm -rf /var/lib/apt/lists/*

# Copy root workspace configuration and manifests
COPY package.json package-lock.json ./
COPY packages/api-contracts/package.json ./packages/api-contracts/
COPY apps/api/package.json ./apps/api/
COPY apps/web/package.json ./apps/web/

# Install all workspace dependencies cleanly
RUN npm ci

# Copy source code for TypeScript packages and apps
COPY packages/api-contracts/ ./packages/api-contracts/
COPY apps/api/ ./apps/api/
COPY apps/web/ ./apps/web/

# Build api-contracts, api, and web
RUN npm run build --workspaces

# ==========================================
# Stage 2: Production Runtime with Python 3.11, OpenJDK 17 & Node.js
# ==========================================
FROM python:3.11-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    NODE_ENV=production \
    DEBIAN_FRONTEND=noninteractive \
    PORT=10000 \
    DEFAULT_DEVICE=cpu \
    MODEL_SERVICE_URL=http://127.0.0.1:8000 \
    EXECUTION_RUNNER_URL=http://127.0.0.1:5000 \
    PYTHONPATH=/app \
    NODE_PATH=/app/node_modules:/app/apps/api/node_modules \
    TRANSFORMERS_CACHE=/root/.cache/huggingface/hub \
    HF_HOME=/root/.cache/huggingface

# Install system dependencies:
# - curl & ca-certificates
# - openjdk-17-jdk-headless (javac + java for differential execution)
# - nodejs (for running Express API)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    ca-certificates \
    openjdk-17-jdk-headless \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install PyTorch CPU first (small footprint, fast download, no CUDA overhead)
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir torch --index-url https://download.pytorch.org/whl/cpu

# Install Python requirements for Model Service & Execution Runner
COPY services/model-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r ./requirements.txt

# Copy built Node.js workspace and frontend assets from Stage 1
COPY --from=build-stage /app/node_modules ./node_modules
COPY --from=build-stage /app/package.json ./package.json
COPY --from=build-stage /app/packages/ ./packages/
COPY --from=build-stage /app/apps/api/ ./apps/api/
COPY --from=build-stage /app/apps/web/dist ./apps/web/dist

# Copy Python services, configs, benchmark suites, and database scaffolding
COPY services/ ./services/
COPY configs/ ./configs/
COPY database/ ./database/
COPY ml/ ./ml/

# Create symlinks for Python package resolution and prepare dirs
RUN ln -s /app/services/model-service /app/services/model_service && \
    ln -s /app/services/execution-runner /app/services/execution_runner && \
    mkdir -p /app/database

# Pre-cache Salesforce/codet5-small model weights in HuggingFace cache during image build
RUN python -c "from transformers import AutoTokenizer, AutoModelForSeq2SeqLM; \
    AutoTokenizer.from_pretrained('Salesforce/codet5-small'); \
    AutoModelForSeq2SeqLM.from_pretrained('Salesforce/codet5-small')"

# Pre-train / fine-tune CodeT5 small directly during Docker build so the fine-tuned checkpoint exists on disk
RUN python ml/training/train_seq2seq.py \
    --model_name_or_path Salesforce/codet5-small \
    --train_file ml/data/train.json \
    --val_file ml/data/val.json \
    --source_lang python \
    --target_lang java \
    --output_dir /app/checkpoints/codet5-small-finetuned \
    --epochs 5 \
    --batch_size 4 \
    --learning_rate 2e-4

# Copy and setup entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN sed -i 's/\r$//' /app/entrypoint.sh && chmod +x /app/entrypoint.sh

EXPOSE 10000

# Container healthcheck for Render
HEALTHCHECK --interval=20s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:${PORT:-10000}/health || exit 1

ENTRYPOINT ["/app/entrypoint.sh"]
