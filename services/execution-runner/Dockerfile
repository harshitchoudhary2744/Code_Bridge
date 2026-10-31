FROM python:3.11-slim-bookworm
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    openjdk-17-jdk-headless \
    && rm -rf /var/lib/apt/lists/*
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir fastapi uvicorn pydantic
COPY services/execution-runner/ ./services/execution-runner/
RUN ln -s /app/services/execution-runner /app/services/execution_runner
ENV PYTHONPATH=/app
EXPOSE 5000
CMD ["python", "-m", "uvicorn", "services.execution_runner.src.main:app", "--host", "0.0.0.0", "--port", "5000"]
