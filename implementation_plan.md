# Implementation Plan
# TransCode Lab — Multi-Model Encoder–Decoder Code Translation

**Version:** 2.0 | **Frontend:** React + Vite + TypeScript (not Next.js) | **Initial pair:** Python 3.11 ↔ Java 17

## 0. Build strategy

Build a working multi-model vertical slice before large-scale fine-tuning. The largest risk is whether several suitable encoder–decoder checkpoints can be loaded, run on the same language pair, and evaluated with trustworthy tests within available hardware and license constraints. A paper's existence does not prove a maintained checkpoint exists or that it is usable with current libraries.

Core experiment: compare first-candidate behavioral correctness of at least two verified encoder–decoder checkpoints on a fixed held-out set; then separately measure compiler/test-feedback repair's impact and latency cost. Aim for three distinct families if feasible, but keep the application honest and runnable with two.

## 1. Research and feasibility gate

1. Inspect repository, supplied docs and local environment: Node, Python 3.11+, Java 17, Docker, RAM, disk and GPU/CUDA.
2. Verify primary papers and official model cards for CodeT5/CodeT5+, PLBART and TransCoder.
3. For each candidate confirm architecture, checkpoint availability, license, tokenizer, supported languages/tasks, memory needs and current API compatibility.
4. Run a real inference smoke test for each candidate before adding it to `AVAILABLE` status.
5. Record a model matrix in `docs/model-feasibility.md`.
6. Mark nonworking/unverified models `PLANNED`, `DOWNLOAD_REQUIRED`, `FINE_TUNING_REQUIRED` or `INCOMPATIBLE`; never show fake output.

Exit criteria: at least two plausible checkpoints; actual inference test per selected model; clear record of unsupported candidates.

## 2. Dataset audit and evaluation design

1. Inspect TransCoder artifacts/tests, CoTran/AVATAR-TC resources and CodeXGLUE.
2. Respect language-pair facts: CodeXGLUE's code translation task is Java↔C#, not Python↔Java.
3. Verify license, provenance, data format, expected outputs and test reliability.
4. If licensed Python↔Java pairs/tests are not available, use a documented, reviewed small test set or choose a benchmark-supported pair such as Java↔C# and label it accurately.
5. Deduplicate exact/near duplicates; split by repository/problem when possible; keep the final test split untouched.
6. Generate `dataset_manifest.json`, `dataset_audit.md`, split manifests, provenance/license table and filtering statistics.

Required metadata: dataset version/source, license, language pair, counts before/after filtering, rejected-record reasons, duplicate policy, split seed/grouping and test provenance.

Exit criteria: reproducible data loader; verified test fixture; benchmark language pair matches its actual data.

## 3. Milestone 1 — Repository and contracts

- Create monorepo structure from TRD.
- Scaffold React + Vite + TypeScript, Express + TypeScript and FastAPI service.
- Define validated API contracts and OpenAPI docs.
- Add SQLite migrations, model registry schema, readiness statuses, `.env.example`, `.gitignore`, lint/type/test commands.
- Build the workbench shell with selectable models and honest loading/empty states.

Exit criteria: services start, health endpoints work, model registry accurately reports status. Do not claim translation until a real checkpoint has passed inference.

## 4. Milestone 2 — Model registry and inference

1. Implement common `TranslationModelAdapter` protocol.
2. Integrate the first verified model and run smoke tests.
3. Integrate the second verified model and run smoke tests.
4. Add a third only after feasibility checks pass.
5. Support revision/tokenizer config, prefixes, device placement, output limits, generation parameters and output cleanup.
6. Bound concurrency to protect GPU memory.
7. Record inference latency, device, generation settings and errors.
8. Ensure missing checkpoints produce `MODEL_UNAVAILABLE`, never canned code.

Exit criteria: two real models produce inference output; each result has metadata; load failures are independently reported.

## 5. Milestone 3 — Dataset and optional fine-tuning

- Build data inspection, filtering, deduplication and split scripts.
- Implement preprocessing/tokenization appropriate to each model.
- Fine-tune only models with a verified training path, compatible licensed data and adequate compute.
- Save model, tokenizer, hyperparameters, seed, dataset version and parent checkpoint.
- Add validation and evaluation scripts; provide CPU smoke test and GPU guidance.

Do not train from scratch or fine-tune all models simultaneously if hardware is insufficient. State whether each checkpoint is pretrained-only or fine-tuned for the exact translation task. Full fine-tuning is “complete” only after a real run.

## 6. Milestone 4 — Language adapters and sandbox

- Implement Python 3.11 AST/compile/run adapter.
- Implement Java 17 `javac`/`java` adapter.
- Generate wrappers only for supported contracts and signatures.
- Run source and target on identical logical test inputs.
- Apply fixed commands, safe generated files, strict output comparison, timeout and cleanup.
- Execute in short-lived Docker workers with no network, non-root identity and resource limits.
- Test invalid syntax, compile failure, runtime exception, timeout, output limits and hostile inputs.

Exit criteria: source baseline failures are distinct from target failures; sandbox unavailable state is explicit; no user code runs in API/model process.

## 7. Milestone 5 — Validation and semantic tests

- Implement generation, syntax, compile, source baseline, target execution and behavioral comparison stages.
- Keep model errors distinct from infrastructure errors.
- Add applicable edge cases: integer division, overflow/precision, null-like values, equality, truthiness, aliasing/mutability, Unicode, collection ordering, exceptions and boundaries.
- Accept user tests and trusted dataset tests; generated tests are optional and must have a validation policy.
- Persist per-test inputs/outputs and failure categories.

Exit criteria: compiling-but-wrong code is behaviorally failed; source failure is `NOT_COMPARABLE`; missing/skipped tests are not passes.

## 8. Milestone 6 — Multi-model orchestration

1. Accept multiple available model IDs in one job.
2. Create independent model runs under one comparison job.
3. Supply identical source, contract and tests.
4. Record model-specific settings and disclose deviations.
5. Bound concurrency; let one model fail without canceling others.
6. Persist candidate/results as each model completes.
7. Aggregate only actual persisted results.
8. Build comparison table, code diff and JSON/CSV report export.

Exit criteria: two real model adapters execute within the same job and retain independent status/metrics.

## 9. Milestone 7 — Optional repair experiment

- Add explicit “Run repair experiment” action.
- Preserve first-pass candidates/results immutably.
- Feed real compiler diagnostics, failing input, expected/actual output and previous candidate to a configured repair model.
- Default to three retries after the first candidate.
- Revalidate every attempt, detect repeated candidates, limit feedback size and save history.
- Report repair success and added latency separately from raw model results.

Exit criteria: actual failure triggers real inference; retry cap enforced; raw and repaired metrics remain separate.

## 10. Milestone 8 — Benchmark Lab

Primary question: how do verified encoder–decoder checkpoints differ in first-pass behavioral correctness, compilation, latency and resource use on the same held-out set?

Secondary question: does feedback repair improve correctness and at what cost?

Metrics: syntax success, compile success, first-pass behavioral pass rate, post-repair pass rate, per-test pass rate, exact match, BLEU/CodeBLEU if correctly configured, median/p95 latency, peak RAM/VRAM when measured, load/timeout failure rates, retry and repair success rates.

Controls: same held-out examples and tests; record model/tokenizer revisions, generation settings, device and seed; avoid test leakage; separate warmup from timing; repeat timing when feasible; report unavailable metrics rather than imputing.

Ablations: each model single-pass; best model with/without repair; text/code metrics vs execution correctness; optionally common generation budget vs model-native settings.

Exit criteria: metrics derive from stored raw results; exports match database; no invented scores.

## 11. Milestone 9 — UI, integration and security

Complete workbench, per-model outputs, validation summaries, history, model registry and benchmark screens. Add loading, unavailable, error, empty and partial-result states. Check keyboard/accessibility and responsive behavior. Validate request sizes and generation parameters. Audit runner isolation, temp-file cleanup and secret exposure. Verify persistence after restart.

Exit criteria: UI uses real API responses; no fake progress or inert controls; unavailable/failed models are represented honestly.

## 12. Suggested phase order

| Phase | Deliverable | Priority |
|---|---|---|
| 1 | Research feasibility/model matrix | P0 |
| 2 | Repo, API contracts, model registry | P0 |
| 3 | Two real model adapters and smoke tests | P0 |
| 4 | Dataset audit and verified fixture | P0 |
| 5 | Python/Java sandbox and differential tests | P0 |
| 6 | Multi-model workbench and persistence | P0 |
| 7 | Repair loop | P1 |
| 8 | Fine-tuning and wider evaluation | P1 |
| 9 | Third model family and ablations | P1 |
| 10 | Final report and demonstration | P0 |

Do not start with UI polish or training every candidate. First prove the real model/validation path.

## 13. Definition of done

- [ ] React + Vite frontend, not Next.js.
- [ ] Express API and FastAPI model service start.
- [ ] Registry reports accurate readiness and provenance.
- [ ] At least two genuine encoder–decoder checkpoints are used in comparison.
- [ ] Same input and test fixtures are used across models.
- [ ] No hard-coded production translations.
- [ ] Python/Java syntax, compile and execution checks work for the supported contract.
- [ ] Source and target run on identical logical inputs.
- [ ] Missing checks never count as passes.
- [ ] Repair uses real feedback and bounded model calls.
- [ ] First-pass and repaired metrics are separate.
- [ ] Jobs, candidates, tests, metadata and metrics persist.
- [ ] Evaluation is reproducible from saved configuration.
- [ ] Unit, integration, runner-security and E2E tests are executed.
- [ ] Checkpoint licenses/revisions and data provenance are documented.
- [ ] README commands match implementation.
- [ ] Missing hardware/data/checkpoints and unfinished experiments are explicit.

## 14. Final demonstration

1. Show model readiness.
2. Select Python→Java and add boundary tests.
3. Select at least two available encoder–decoder models.
4. Run comparison and demonstrate actual model-generated candidates.
5. Compare validation, behavior, latency and output.
6. Inspect a failed test/counterexample.
7. Run optional repair and show attempt history.
8. Explain that tests are evidence, not a universal equivalence proof.
9. Show benchmark metrics from the recorded dataset.
10. Export report and explain which models were pretrained-only or fine-tuned.

## 15. Research references
- CodeT5 (EMNLP 2021): https://aclanthology.org/2021.emnlp-main.685/
- PLBART (NAACL-HLT 2021): https://aclanthology.org/2021.naacl-main.211/
- TransCoder (NeurIPS 2020): https://proceedings.neurips.cc/paper/2020/hash/ed23fbf18c2cd35f8c7f8de44f85c08d-Abstract.html
- CodeT5+ models: https://github.com/salesforce/CodeT5/tree/main/CodeT5+
- CodeXGLUE: https://github.com/microsoft/CodeXGLUE
- CodeXGLUE translation README: https://github.com/microsoft/CodeXGLUE/blob/main/Code-Code/code-to-code-trans/README.md
- CodeBLEU: https://arxiv.org/abs/2009.10297
- TransCoder-ST: https://openreview.net/forum?id=cmt-6KtR4c4
- TransCoder-IR: https://arxiv.org/abs/2207.03578
- CoTran materials: https://github.com/prithwishjana/cotran
- PLBart docs: https://huggingface.co/docs/transformers/model_doc/plbart

Recheck current model cards, checkpoint revisions, licenses and compatibility before implementation.
