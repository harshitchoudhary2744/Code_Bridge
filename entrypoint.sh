#!/usr/bin/env bash
set -e

echo "=== Starting TransCode Lab Unified Platform ==="

# Trap termination signals to ensure child processes are cleaned up
cleanup() {
    echo "Shutting down TransCode Lab processes..."
    kill -TERM "$MODEL_PID" "$RUNNER_PID" "$API_PID" 2>/dev/null || true
    wait "$MODEL_PID" "$RUNNER_PID" "$API_PID" 2>/dev/null || true
    exit 0
}
trap cleanup SIGINT SIGTERM EXIT

# 1. Start Python Model Service on 127.0.0.1:8000
echo "[1/3] Starting Model Service on 127.0.0.1:8000..."
python -m uvicorn services.model_service.src.main:app --host 127.0.0.1 --port 8000 &
MODEL_PID=$!

# 2. Start Python Execution Runner on 127.0.0.1:5000
echo "[2/3] Starting Execution Runner on 127.0.0.1:5000..."
python -m uvicorn services.execution_runner.src.main:app --host 127.0.0.1 --port 5000 &
RUNNER_PID=$!

# Wait for internal microservices to be ready
echo "Waiting for internal microservices to become ready..."
for i in {1..30}; do
    if curl -s http://127.0.0.1:8000/health >/dev/null && curl -s http://127.0.0.1:5000/health >/dev/null; then
        echo "Internal microservices are ready!"
        break
    fi
    sleep 1
done

# 3. Start Node.js Express API & Static Web Server in foreground on Render's $PORT
TARGET_PORT="${PORT:-10000}"
echo "[3/3] Starting Express Server on 0.0.0.0:${TARGET_PORT}..."
export PORT="${TARGET_PORT}"
export MODEL_SERVICE_URL="http://127.0.0.1:8000"
export EXECUTION_RUNNER_URL="http://127.0.0.1:5000"

node apps/api/dist/server.js &
API_PID=$!

# Keep running while main API process is alive
wait "$API_PID"
