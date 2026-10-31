# Technical Requirements Document (TRD)
# TransCode Lab — Multi-Model Encoder–Decoder Code Translation

**Version:** 2.0 | **Date:** 29 October 2026 | **Frontend:** React + Vite + TypeScript | **Initial languages:** Python 3.11 ↔ Java 17

## 1. Architecture

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React, Vite, TypeScript, Monaco Editor | Workbench, result comparison, reports |
| API/orchestration | Node.js, Express, TypeScript, Zod | Job lifecycle, persistence, API validation |
| Database | SQLite for local MVP; migrations | Jobs, model snapshots, attempts, tests, metrics |
| Model service | Python 3.11, FastAPI, PyTorch, Transformers | Registry adapters, inference, optional fine-tuning |
| Queue | Bounded local queue initially; Redis/Celery only if needed | Long jobs and GPU protection |
| Validation | Python AST/compiler; Java 17 `javac` | Syntax and compile checks |
| Execution | Isolated Docker workers, no network, non-root | Source and candidate execution |
| Evaluation | Python scripts, pytest, JSONL/CSV | Reproducible benchmark and ablations |
| Orchestration | Docker Compose | Local services |

### Service flow

```text
React/Vite -> Express API + SQLite -> comparison orchestrator -> FastAPI model service
                                                |                 + Model registry
                                                |                 + CodeT5/CodeT5+ adapter
                                                |                 + PLBART adapter
                                                |                 + optional verified TransCoder adapter
                                                + validation coordinator
                                                  + Python runner
                                                  + Java compile/run worker
                                                  + differential evaluator
                                                  + optional repair loop
```

Execution runners must be isolated from API/model processes. Never execute user code inside Express or FastAPI.

## 2. Model strategy and feasibility

The primary leaderboard contains encoder–decoder Transformer models only. Decoder-only models, if later included, must be shown in a separate exploratory track.

| Candidate | Publisher/source | Architecture | Role | Caveat |
|---|---|---|---|---|
| CodeT5 / CodeT5+ | Salesforce | Encoder–decoder; family variants differ | Code-specialized baseline | Pretrained checkpoint is not automatically fine-tuned for translation |
| PLBART | Research authors / Hugging Face ecosystem | BART-like encoder–decoder | Alternative seq2seq baseline with Java/Python relevance | Verify checkpoint availability, tokenizer, license and generation config |
| TransCoder family | Meta/Facebook AI Research paper line | Encoder–decoder | Alternative candidate if usable checkpoint verified | Do not assume old paper artifacts work with current APIs or terms |
| Further model | Verified publisher | Confirm from config and paper | Add only after checks | Architecture, license and inference must pass gate |

Aim for multiple model families and, where feasible, different publishers. Do not claim three providers/models until verified. Publisher is descriptive metadata, not a scientific fairness guarantee.

### Readiness statuses
- `AVAILABLE`: weights/config/tokenizer installed and inference smoke test passed.
- `DOWNLOAD_REQUIRED`: valid config but weights absent.
- `FINE_TUNING_REQUIRED`: pretrained initialization only; task quality not established.
- `INCOMPATIBLE`: failed load, missing dependencies or unsupported architecture.
- `DISABLED`: intentionally excluded.
- `PLANNED`: candidate not yet verified.

Only `AVAILABLE` models may execute. Unavailable models never return canned output.

### Registry schema

```json
{
  "id": "publisher-family-checkpoint",
  "displayName": "Human-readable model name",
  "publisher": "Verified organization",
  "architecture": "encoder-decoder",
  "checkpoint": "repository/model or local path",
  "revision": "immutable revision where supported",
  "tokenizer": "tokenizer identifier",
  "license": "verified label or UNKNOWN",
  "licenseUrl": "source URL",
  "paperUrl": "primary paper URL",
  "supportedTasks": ["code-to-code"],
  "supportedLanguages": ["python", "java"],
  "parameterCount": null,
  "deviceRequirements": {},
  "status": "DOWNLOAD_REQUIRED",
  "limitations": []
}
```

Metadata must be verified, not guessed. Save a registry snapshot for each run.

### Adapter interface

```python
class TranslationModelAdapter:
    def load(self, config): ...
    def health(self): ...
    def translate(self, source_code, source_language, target_language, generation_config): ...
    def metadata(self): ...
    def unload(self): ...
```

Use an abstract base class/protocol and typed return values. Each adapter handles tokenizer conventions, language prefixes/special tokens, generation settings, output cleanup and device placement. Do not assume all seq2seq models use the same format.

### Fair inference

Record model and tokenizer revision, language direction, max input/output tokens, beam/sampling settings, seed where supported, precision/device, batch size, warm/cold timing, latency and peak memory when measurable. Run the same examples and tests for each model. Disclose settings that cannot be matched exactly.

## 3. Dataset and training

Audit source, license, language pair, data format, tests and split integrity before use.

Candidates:
- CodeXGLUE code-to-code translation is Java↔C#, with 10,300 train, 500 validation and 1,000 test examples in the published README. Do not label it Python↔Java.
- TransCoder paper artifacts include evaluation functions and tests for C++, Java and Python; verify artifact availability and terms.
- CoTran/AVATAR-TC may be useful; inspect actual files and license.
- PLBART is a model resource, not automatically a dataset for the chosen benchmark.

If suitable licensed Python↔Java pairs/tests are unavailable, either use a documented reviewed evaluation set or choose a benchmark-supported pair such as Java↔C# and keep Python↔Java as a separate prototype. Do not fabricate data.

Produce `dataset_manifest.json`, `dataset_audit.md`, split manifests, provenance/license table, filtering counts and duplicate report. Prefer grouping by repository/problem to reduce leakage. Keep final held-out data untouched until evaluation.

Do not train from scratch. Smoke-test inference first. Fine-tune only models with a verified training path, compatible data and suitable compute. Track hyperparameters, environment, seed, data version and parent checkpoint. CPU smoke tests are reasonable; do not promise full training is practical on CPU.

## 4. API contracts

- `GET /health` — liveness.
- `GET /ready` — DB, model-service and runner readiness, per model.
- `GET /api/v1/models` — model metadata/readiness.
- `POST /api/v1/comparisons` — create multi-model job.
- `GET /api/v1/comparisons/:id` — aggregate and per-model status.
- `GET /api/v1/comparisons/:id/models/:modelId` — candidate, metadata, gates and diagnostics.
- `POST /api/v1/comparisons/:id/repair` — separate bounded repair experiment.
- `GET /api/v1/history` — history with filters/pagination.
- `GET /api/v1/benchmarks` — benchmark manifests.
- `POST /api/v1/benchmarks/runs` — reproducible benchmark run.
- `GET /api/v1/benchmarks/runs/:id` — run progress and metrics.
- `GET /api/v1/reports/:id?format=json|csv` — export persisted report.

Example request:

```json
{
  "sourceLanguage": "python",
  "sourceVersion": "3.11",
  "targetLanguage": "java",
  "targetVersion": "17",
  "sourceCode": "def add(a, b):\\n    return a + b",
  "entryPoint": {"kind": "function", "name": "add"},
  "tests": [{"input": [2, 3], "expectedOutput": 5}],
  "modelIds": ["verified-model-a", "verified-model-b"],
  "mode": "validate",
  "generation": {"maxNewTokens": 512, "numBeams": 4}
}
```

Validate code length, test count, language pair, model IDs and generation limits. If expected outputs are absent, source execution may act as oracle only if source runs safely under the declared contract. Use consistent errors and OpenAPI documentation.

## 5. Validation architecture

For every candidate: confirm generation completed → parse target → compile target where applicable → execute source on test contract → execute target on same logical inputs → compare outputs/exceptions/exit statuses per explicit policy → persist evidence.

If source execution fails, mark `NOT_COMPARABLE`, not target failure. Skipped tests remain skipped. Default comparison is strict for JSON/scalars; preserve list order and meaningful whitespace. Numeric tolerance must be explicitly declared. Do not normalize away semantics.

Python adapter: Python 3.11 AST/compile/run. Java adapter: Java 17 `javac` and `java`. Use safe wrapper generation only for supported signatures; do not rely solely on regex signature guesses.

Statuses: `QUEUED`, `GENERATING`, `GENERATION_FAILED`, `SYNTAX_FAILED`, `COMPILE_FAILED`, `SOURCE_BASELINE_FAILED`, `EXECUTION_FAILED`, `PARTIAL_EVIDENCE`, `PASSED_AVAILABLE_TESTS`, `FAILED_BEHAVIORAL_TESTS`, `UNSUPPORTED`, `MODEL_UNAVAILABLE`, `NOT_RUN`.

## 6. Optional feedback repair

Repair is a separate experiment. Provide source, target language, previous candidate, compiler diagnostics, failing test input, expected/actual outputs and failure category to the configured repair model. Default maximum: three repair attempts after the initial candidate. Revalidate every attempt, detect repeated candidates, limit feedback size and preserve all history. Report first-pass and repaired metrics separately.

## 7. Persistence

Tables: `comparison_jobs`, `comparison_model_runs`, `model_registry_snapshots`, `translation_candidates`, `validation_gates`, `test_cases`, `test_results`, `repair_attempts`, `benchmark_runs`, `benchmark_metrics`, `dataset_manifests`.

Persist model revision/tokenizer/config, dataset/split, generation settings, seed, device, timing, candidates, tests and diagnostics. Use migrations, foreign keys and indexes. Apply input limits and avoid logging source code by default.

## 8. Security

All code is untrusted. Use isolated short-lived Docker workers, non-root user, no network, CPU/RAM/PID/disk/output/wall-clock limits, fixed commands, restricted temp dirs, controlled mounts, no secrets and guaranteed cleanup. Never expose Docker socket to user code. If sandbox unavailable, disable execution checks and report it.

## 9. Suggested structure

```text
transcode-lab/
  apps/web/                 # React + Vite + TS
  apps/api/                 # Express + TS
  services/model-service/   # FastAPI, registry, adapters, inference
  services/execution-runner/
  packages/api-contracts/
  ml/data/                  # preparation and audit
  ml/training/              # train/evaluate
  ml/benchmarks/            # runner, metrics, reports
  configs/models.yaml
  configs/languages.yaml
  configs/evaluation.yaml
  database/migrations/
  tests/integration/
  docs/model-feasibility.md
  docs/dataset_audit.md
  docs/research_notes.md
  docker-compose.yml
  .env.example
  README.md
  prd.md
  trd.md
  implementation_plan.md
```

## 10. Testing

- Unit: registry schemas, status transitions, adapters, output extraction, metric math, migrations, comparison policy, retry limit.
- Model integration: each available checkpoint loads and produces real inference; test each supported direction; load failures become `MODEL_UNAVAILABLE`.
- Runner: valid/invalid Python and Java, runtime exception, timeout, output limits, no network, cleanup, hostile input isolation.
- Evaluation: same fixtures for each model; invalid source baseline not counted as target failure; missing tests not passes; first-pass/repair metrics separate; export matches DB.
- E2E: at least two actual configured models on one translation example. If only one works, multi-model acceptance remains incomplete; do not mock a second model in E2E.

## 11. Observability

Structured logs with job/model/attempt/stage/error IDs. Do not log secrets or full source by default. Record queue wait, generation/validation latency, memory where measurable, and failure categories. One model's failure should not cancel other runs unless shared infrastructure fails.

## 12. Research-to-design traceability

- **CodeT5 (EMNLP 2021):** code-specialized encoder–decoder and identifier-aware pretraining; task-specific fine-tuning still required for claims.
- **PLBART (NAACL-HLT 2021):** seq2seq pretrained on Java/Python and evaluated on translation; verify checkpoint suitability.
- **TransCoder (NeurIPS 2020):** unsupervised translation among C++, Java and Python with evaluation functions/tests; verify usable checkpoint.
- **CodeXGLUE:** benchmark includes Java↔C# translation; do not mislabel its dataset.
- **CodeBLEU:** complementary code-aware similarity, not proof of behavior.
- **TransCoder-ST:** test-driven filtering motivates executable validation/data filtering.
- **TransCoder-IR:** IR-based translation is a possible future experiment, not an MVP prerequisite.

## 13. References
- CodeT5: https://aclanthology.org/2021.emnlp-main.685/
- PLBART: https://aclanthology.org/2021.naacl-main.211/
- PLBart docs: https://huggingface.co/docs/transformers/model_doc/plbart
- TransCoder: https://proceedings.neurips.cc/paper/2020/hash/ed23fbf18c2cd35f8c7f8de44f85c08d-Abstract.html
- CodeT5+: https://github.com/salesforce/CodeT5/tree/main/CodeT5+
- CodeXGLUE: https://github.com/microsoft/CodeXGLUE
- CodeXGLUE translation README: https://github.com/microsoft/CodeXGLUE/blob/main/Code-Code/code-to-code-trans/README.md
- CodeBLEU: https://arxiv.org/abs/2009.10297
- TransCoder-ST: https://openreview.net/forum?id=cmt-6KtR4c4
- TransCoder-IR: https://arxiv.org/abs/2207.03578
- CoTran: https://github.com/prithwishjana/cotran

Verify current checkpoint availability, architecture, license and compatibility before implementation.
