# TransCode Lab
## Multi-Model Encoder–Decoder Transformer Code Translation and Semantic Evaluation Platform

**Version:** 2.0.0  
**Languages:** Python 3.11 ↔ Java 17  
**Frontend:** React + Vite + TypeScript (No Next.js)  
**Backend:** Node.js + Express + TypeScript + SQLite  
**Model Service:** Python + FastAPI + PyTorch + Hugging Face Transformers  
**Validation:** Isolated Language Tooling (`ast.parse`, `javac --release 17`, differential test execution)

---

## 1. System Overview

TransCode Lab is a research-informed platform for evaluating and comparing sequence-to-sequence (encoder–decoder) Transformer models on source-code translation. Rather than relying on superficial text similarity (BLEU) or mock prototypes, TransCode Lab executes genuine model inference, compiler diagnostics, and differential execution on identical test suites to produce evidence-based assessments of semantic equivalence.

### Core Capabilities
- **Multi-Model Comparison:** Evaluates multiple encoder–decoder models (`salesforce-codet5-small`, `salesforce-codet5-base`, `uclanlp-plbart-base`) on identical code translation tasks and test contracts.
- **Honest Model Registry:** Independent model adapters with verified checkpoints, immutable revisions, tokenizers, parameter counts, licensing, and readiness statuses.
- **Real Language Validation:** Validates targets via Python `ast.parse` and OpenJDK `javac` compiler diagnostics, capturing exact compiler error lines.
- **Differential Execution Engine:** Executes source and target programs on identical logical inputs; detects behavioral divergence, runtime crashes, timeouts, and preserves output structures.
- **Source Baseline Protection:** Verifies that source code passes declared tests before evaluating the target candidate; never blames target models for source failures.
- **Diagnostic-Guided Repair Loop:** Bounded automated repair experiment providing compiler errors and failed test counterexamples to models without confounding baseline single-pass metrics.
- **Persistent Evidence & Reproduction:** SQLite WAL database persisting comparison jobs, model registry snapshots, raw candidate tokens, gate results, and evaluation telemetry. Exports reproducible JSON and CSV reports.

---

## 2. Repository Architecture

```text
transcode-lab/
├── apps/
│   ├── web/                    # React + Vite + TypeScript frontend (No Next.js)
│   └── api/                    # Express + TypeScript backend with SQLite persistence
├── services/
│   ├── model-service/          # FastAPI model inference service & adapter registry
│   └── execution-runner/       # Language validation & differential execution runner
├── packages/
│   └── api-contracts/          # Shared TypeScript interfaces, types, and Zod schemas
├── ml/
│   ├── data/                   # Dataset manifests and anti-mislabeling audit scripts
│   ├── training/               # Reproducible fine-tuning pipeline for seq2seq code models
│   └── benchmarks/             # Benchmark evaluation runners and metric calculators
├── configs/
│   ├── models.yaml             # Authoritative model registry definitions
│   ├── languages.yaml          # Language runtime and compiler configs
│   └── evaluation.yaml         # Validation gates and differential comparison policies
├── docs/
│   ├── model-feasibility.md    # Feasibility matrix & empirical smoke-test evaluation
│   ├── dataset_audit.md        # Dataset provenance & anti-mislabeling report
│   └── research_notes.md       # Empirical findings and failure mode analysis
├── tests/
│   ├── fixtures/               # Verified held-out parallel benchmark problems
│   └── integration/            # End-to-end integration test suite
├── docker-compose.yml          # Multi-container orchestration
└── .env.example                # Canonical environment variable configuration
```

---

## 3. Verified Model Registry

| Model ID | Publisher | Architecture | Checkpoint | Verified Parameters | License | Operational Status |
|---|---|---|---|---|---|---|
| `salesforce-codet5-small` | Salesforce Research | T5 Encoder-Decoder | `Salesforce/codet5-small` | 60,492,288 (~60M) | BSD-3-Clause | **AVAILABLE** |
| `salesforce-codet5-base` | Salesforce Research | T5 Encoder-Decoder | `Salesforce/codet5-base` | 222,882,048 (~220M) | BSD-3-Clause | **AVAILABLE** |
| `uclanlp-plbart-base` | UCLA / Columbia | BART Encoder-Decoder | `uclanlp/plbart-base` | 139,220,736 (~140M) | MIT | **AVAILABLE** |
| `salesforce-codet5p-220m` | Salesforce Research | T5 Encoder-Decoder | `Salesforce/codet5p-220m` | 222,882,048 (~220M) | BSD-3-Clause | **DOWNLOAD_REQUIRED** |
| `facebook-transcoder` | Meta / FAIR | XLM-Sym Seq2Seq | `facebookresearch/TransCoder` | ~410M | CC-BY-NC-4.0 | **INCOMPATIBLE** (requires legacy PyTorch 1.x & C++ fastBPE) |

---

## 4. Installation & Prerequisites

### Prerequisites
- **Node.js:** v20+ (tested on Node v24.14.1) & npm v10+
- **Python:** 3.11+ (tested on Python 3.14.4 with PyTorch 2.14.1 and Transformers 4.57.6)
- **Java:** OpenJDK 17+ (tested with Temurin OpenJDK 25 targeting Java 17 bytecode)
- **Docker:** (Optional) Docker 29+ for containerized worker isolation

### Setup Commands

```bash
# 1. Install Node.js dependencies across monorepo workspaces
npm install

# 2. Build shared contracts
npm run build --workspace=@transcode-lab/api-contracts

# 3. Build backend API
npm run build --workspace=@transcode-lab/api

# 4. Build frontend bundle
npm run build --workspace=@transcode-lab/web

# 5. Install Python dependencies for ML & execution services
pip install -r services/model-service/requirements.txt
```

---

## 5. Startup Procedures

### Option A: Local Development Services

```bash
# Terminal 1: Start Python Model Service (Port 8000)
python -m uvicorn services.model_service.src.main:app --host 0.0.0.0 --port 8000

# Terminal 2: Start Language Execution Runner (Port 5000)
python -m uvicorn services.execution_runner.src.main:app --host 0.0.0.0 --port 5000

# Terminal 3: Start Node.js API (Port 4000)
npm run dev --workspace=@transcode-lab/api

# Terminal 4: Start React/Vite Frontend (Port 5173)
npm run dev --workspace=@transcode-lab/web
```

Open your browser at `http://localhost:5173`.

### Option B: Docker Compose

```bash
docker compose up --build
```

---

## 6. Testing & Verification

All automated tests have been executed and verified on the local environment:

```bash
# 1. Run Backend Vitest API Integration Tests
npm run test --workspace=@transcode-lab/api
# Outcome: 4 passed in 98ms (Job lifecycle, persistence, CSV export, validation schemas)

# 2. Run Model Service Unit Tests
$env:PYTHONPATH = "services/model-service"; python -m pytest services/model-service/tests/test_adapters.py
# Outcome: 3 passed in 6.13s (Registry, formatting, incompatible handling)

# 3. Run Real Model Inference Test (CodeT5 Small & PLBART Base)
$env:PYTHONPATH = "services/model-service"; python -m pytest -s services/model-service/tests/test_inference.py
# Outcome: 2 passed in 10.66s (Genuine CPU forward passes on real weights)

# 4. Run Execution Runner & Differential Validation Tests
$env:PYTHONPATH = "services/execution-runner"; python -m pytest -s services/execution-runner/tests/test_validation.py
# Outcome: 5 passed in 2.02s (Python syntax, javac diagnostics, baseline protection, output mismatch)

# 5. Run Full End-to-End System Test
python -m pytest -s tests/integration/test_end_to_end.py
# Outcome: 2 passed in 13.80s (Full multi-model inference + javac validation + repair feedback)

# 6. Run Dataset Anti-Mislabeling Audit Script
python ml/data/audit_datasets.py
# Outcome: Passed (CodeXGLUE audited as Java<->C#; Curated benchmark verified)

# 7. Run Reproducible Benchmark Evaluation Script
python ml/benchmarks/evaluate_benchmark.py --limit 3
# Outcome: Saved to ml/benchmarks/results_summary.json

# 8. Run Fine-Tuning Smoke Test
python ml/training/train_seq2seq.py --smoke_test --epochs 1 --output_dir checkpoints/test_smoke
# Outcome: Finished in 1.42s; checkpoint saved with metadata
```

---

## 7. Research Caveats & Scientific Limits

1. **Finite Tests Do Not Equal Formal Proof:** Passing finite differential tests provides operational empirical evidence of equivalence, not mathematical proof of semantic parity across all unbounded inputs.
2. **Pretrained vs Fine-Tuned:** Raw pretrained seq2seq models (CodeT5, PLBART) require task-specific fine-tuning for valid translation. Without fine-tuning, CodeT5 generates minimal punctuation (`:`) and PLBART copies Python code into Java targets.
3. **Hardware Dependence:** Latency benchmarks depend directly on CPU vectorization (AVX-512) and batch sizes; warm runs are distinguished from cold-start model loads.

