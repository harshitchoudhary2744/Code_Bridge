# Product Requirements Document (PRD)
# TransCode Lab — Multi-Model Neural Code Translation and Semantic Evaluation

**Version:** 2.0 | **Date:** 29 October 2026 | **Frontend:** React + Vite + TypeScript (not Next.js) | **Initial language pair:** Python 3.11 ↔ Java 17

## 1. Executive summary

TransCode Lab is a research-oriented developer web application for comparing multiple genuine encoder–decoder Transformer models on source-code translation. Users submit code, select source/target languages and one or more models, compare the independently generated candidates, validate them with parsers/compilers and differential execution, and inspect correctness evidence, failures, latency and resource use.

This is explicitly a **multi-model comparison platform**, not a single-model wrapper. It requires a model registry and adapter interface. Each model must have verified architecture, publisher, checkpoint/revision, tokenizer, license, task suitability, language coverage and readiness status. The primary comparison must contain encoder–decoder models only; decoder-only models, if added later, belong in a separate track.

Candidate families to investigate:
1. **CodeT5 / CodeT5+ (Salesforce)** — code-specialized encoder–decoder baseline.
2. **PLBART** — BART-like encoder–decoder with Java/Python in its pretraining mix.
3. **TransCoder-family encoder–decoder** — include only if an accessible checkpoint, architecture, license, tokenizer and reproducible inference can be verified. Otherwise choose another verified seq2seq checkpoint and label it accurately.

Do not claim three independent model families have been integrated until their real checkpoints load and pass inference tests. The MVP may operate with two verified models while marking other candidates unavailable. Company/provider is useful metadata, but organization alone does not make a scientifically fair comparison.

The initial supported language pair is Python 3.11 ↔ Java 17, with function-level/self-contained code and an explicit input/output contract. Every selected model receives the same task and test fixtures. The UI reports syntax/compile outcomes, behavioral tests, failures, latency, and resource metrics where measurable. A bounded feedback-based repair mode is a separate experiment so raw model quality remains distinguishable from repair-assisted results.

Finite tests provide evidence, not proof of arbitrary semantic equivalence.

## 2. Problem statement

Plausible target code can silently change behavior. Text similarity does not guarantee correctness, and a single model does not reveal differences between model families. The system must run multiple models on the same tasks, combine text/code metrics with executable validation, record reproducible metadata, and make failures and uncertainty visible.

## 3. Goals

### Product goals
- Professional browser-based multi-model translation workbench.
- Python 3.11 ↔ Java 17 initial support.
- Run one model or all available models on the same source.
- Side-by-side candidate comparison and diff.
- Parse/compile and differential-test each candidate.
- Show transparent per-model status, diagnostics, latency and attempt history.
- Persist jobs, model revisions, validation evidence and evaluation runs.
- Export reproducible JSON/CSV reports.

### Research goals
- Compare encoder–decoder model performance under controlled conditions.
- Separate first-candidate correctness from post-repair correctness.
- Measure repair benefit and latency cost.
- Compare exact match/BLEU/CodeBLEU (where valid) with executable behavior.
- Analyze failures by syntax, compilation, runtime, and semantic category.

### Non-goals
- Arbitrary repository-scale migration.
- Formal equivalence proofs for arbitrary programs.
- Training large models from scratch.
- Mixing decoder-only models into the primary encoder–decoder leaderboard.
- Fake example mappings or fabricated benchmark scores.

## 4. Users and journeys

Primary user: student/researcher/developer investigating code translation quality.

Main journey: choose languages → paste code → define entry point and tests → select model(s) → run comparison → inspect candidates and validation → optionally run repair experiment → export report → reopen from history.

Research journey: choose a versioned benchmark split and model set → run reproducible evaluation → compare metrics by model/direction/failure category → export raw results and run metadata.

## 5. Scope and input contract

MVP languages: Python 3.11 and Java 17. Prefer self-contained functions or small programs with a well-defined entry point and serializable inputs/outputs. Full projects with network, filesystem, concurrency, reflection, external dependencies, or uncontrolled side effects are outside the MVP unless explicitly supported.

Inputs: source/target language and version, source code, entry point, optional behavior contract and test cases, model IDs, generation settings within server limits, and mode (`compare`, `validate`, `validate-and-repair`).

Outputs: candidate per model, model/checkpoint metadata, generation status/latency, syntax/compile outcomes, per-test outputs, validation state, diagnostics, repair history, and aggregate comparison report.

## 6. Functional requirements

**FR-1 Model registry:** record model ID, publisher, architecture, checkpoint/revision, tokenizer, license/source URL, paper URL, supported task/languages, parameter count if verified, requirements, readiness and limitations. Only models that pass configuration and inference smoke checks may be selectable as available.

**FR-2 Multi-model execution:** run selected models on identical input; support bounded concurrency and GPU-memory protection. One model failure must not cancel unrelated runs.

**FR-3 Genuine inference:** every production candidate comes from the configured model. No hard-coded input/output maps or canned successful translations. Mocks are permitted only in unit tests and must be labeled.

**FR-4 Fair comparison:** record tokenizer, context/output limits, decoding settings, checkpoint revision, fine-tuning data and model size where known. Disclose material differences.

**FR-5 Validation:** parse/compile and run source/target under the same logical test inputs in isolated workers. Keep syntax, compile, runtime and behavioral results separate.

**FR-6 Semantic edge cases:** test relevant differences such as integer division, overflow/precision, null-like values, truthiness, equality, Unicode/string conversion, mutability, collection ordering, exceptions and boundaries. Claim only checks actually implemented.

**FR-7 Repair experiment:** optional, bounded retry using actual diagnostics and counterexamples. Preserve raw first-pass metrics.

**FR-8 Comparison UI:** per-model code, validation, test pass rate, latency, failure categories, diff and attempt history. Compute all aggregates from persisted results.

**FR-9 History:** persist job, model revision, input hash, evaluation configuration, candidates, tests, logs and results. Historical runs retain registry snapshots.

**FR-10 Export:** JSON/CSV with reproduction metadata.

**FR-11 Honest statuses:** `QUEUED`, `GENERATING`, `VALIDATING`, `PASSED_AVAILABLE_TESTS`, `PARTIAL_EVIDENCE`, `FAILED`, `UNSUPPORTED`, `MODEL_UNAVAILABLE`, `NOT_RUN`. Never mark skipped/unavailable checks as passed.

**FR-12 Readiness:** show installed checkpoints, fine-tuning requirements, hardware limitations and model/service status.

## 7. Screens
1. Model Comparison Workbench.
2. Comparison Results with side-by-side code and validation.
3. Repair Experiment with timeline and feedback.
4. Benchmark Lab with split/model selection and metrics.
5. History and historical run details.
6. Model Registry & Settings.
7. Dataset & Evaluation Details.
8. Responsive workbench.

Visual direction: premium developer tool, dark-neutral editor workspace, restrained accent, readable code, compact tables, subtle borders and clear status indicators. Favor legibility over marketing aesthetics.

## 8. Success metrics
- Syntax and compile success rate.
- First-candidate behavioral pass rate.
- Final pass rate after repair.
- Per-test pass rate and failure distribution.
- Exact match/BLEU/CodeBLEU only when correctly configured.
- Median/p95 inference latency and peak memory/VRAM when measured.
- Retry count and repair success rate.
- Model inference and worker failure rates.

Acceptance: at least two genuine encoder–decoder checkpoints load and compare; every model gets the same tests; statuses are per-model; raw and repaired results are separate; model/data revisions persist; report exports reflect actual results; no fake translation or benchmark values exist.

## 9. Scientific validity and limits

Audit data provenance, licenses, duplicates and split leakage. Text metrics assess similarity, not semantics. Finite tests cannot prove equivalence for all possible inputs. Latency is affected by hardware, model size, batching, and cache state. Reports must disclose these limits. Frame the contribution as a measured engineering hypothesis, not as claiming compiler feedback or formal verification is newly invented.

## 10. Research references
- CodeT5, EMNLP 2021: https://aclanthology.org/2021.emnlp-main.685/
- PLBART, NAACL-HLT 2021: https://aclanthology.org/2021.naacl-main.211/
- TransCoder, NeurIPS 2020: https://proceedings.neurips.cc/paper/2020/hash/ed23fbf18c2cd35f8c7f8de44f85c08d-Abstract.html
- CodeT5+ repository/models: https://github.com/salesforce/CodeT5/tree/main/CodeT5+
- CodeXGLUE: https://github.com/microsoft/CodeXGLUE
- CodeXGLUE Java↔C# translation README: https://github.com/microsoft/CodeXGLUE/blob/main/Code-Code/code-to-code-trans/README.md
- CodeBLEU: https://arxiv.org/abs/2009.10297
- TransCoder-ST: https://openreview.net/forum?id=cmt-6KtR4c4
- TransCoder-IR: https://arxiv.org/abs/2207.03578
- CoTran materials: https://github.com/prithwishjana/cotran
- PLBart docs: https://huggingface.co/docs/transformers/model_doc/plbart

**Research-to-product rule:** a paper/checkpoint's existence does not prove it is currently installable or suitable. Verify current model card, architecture, license, task support and real inference before enabling it.
