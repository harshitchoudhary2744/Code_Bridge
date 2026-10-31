# Research Notes & Empirical Findings — TransCode Lab
## Multi-Model Encoder–Decoder Code Translation and Differential Semantic Evaluation

**Date:** 29 October 2026  
**Authors:** TransCode Lab Research & Engineering Team  
**Evaluated Language Pair:** Python 3.11 ↔ Java 17

---

## 1. Executive Summary

TransCode Lab was engineered to empirically address six fundamental questions in neural code translation:
1. *How do different encoder–decoder Transformer models perform on the same code translation tasks?*
2. *Which models generate syntactically valid and compilable target programs?*
3. *Which models preserve observable behavioral equivalence?*
4. *What error categories do different models commit?*
5. *Can compiler diagnostics and runtime counterexample feedback guide self-repair?*
6. *What trade-offs exist between behavioral accuracy, inference latency, memory footprint, and retry cost?*

---

## 2. Empirical Findings

### Finding 1: Raw Seq2Seq Pretraining Is Insufficient for Code Translation
Both evaluated model families—**CodeT5** (T5 architecture with RoBERTa BPE) and **PLBART** (BART architecture with SentencePiece and language tags)—are capable encoder–decoder Transformers. However, when deployed in their un-finetuned states:
- **CodeT5 Small (60M):** Pretrained on Masked Language Modeling and Identifier Prediction. When given a translation prefix (`translate Python to Java: ...`), it produces minimal punctuation (`:`), causing immediate javac `COMPILE_FAILED` (illegal start of type).
- **PLBART Base (140M):** Pretrained on multilingual denoising autoencoding. When given Python source with language tag `__java__`, it attempts to reconstruct the input code verbatim (`def add(a, b): return a + b`), which also fails javac `COMPILE_FAILED` (invalid method declaration; return type required).

**Scientific Conclusion:** Natural language translation models can often perform zero-shot translation due to multi-lingual parallel pretraining corpora, but code encoder–decoder models strictly require task-specific instruction or parallel supervised fine-tuning. Claiming that raw pretrained CodeT5 or PLBART checkpoints perform out-of-the-box translation is scientifically ungrounded.

### Finding 2: Latency and Resource Scaling on CPU
Under identical hardware conditions (Intel/AMD 12-core CPU, batch size 1):
- `salesforce-codet5-small` (60M params): Median inference latency: **~89–110 ms**.
- `salesforce-codet5-base` (220M params): Median inference latency: **~280–350 ms**.
- `uclanlp-plbart-base` (140M params): Median inference latency: **~480–620 ms**.

PLBART's SentencePiece tokenization and larger embedding vocabulary (50,005 tokens vs 32,100 tokens in CodeT5) contribute to a higher CPU compute footprint per token generation.

### Finding 3: Failure Taxonomy in Bidirectional Translation
The differential evaluation engine uncovered clear failure mode bifurcations across translation directions:
- **Python → Java:** The overwhelming majority of failures are caught early by **Gate 3 (javac Compilation Gate)** due to static type mismatches, missing semicolons, or invalid class structures.
- **Java → Python:** Failures are caught by **Gate 2 (Python Syntax Gate)** via `ast.parse` due to indentation anomalies or Java syntax artifacts (`public static void`, semicolons) polluting the Python AST.

### Finding 4: Bounded Diagnostic-Guided Self-Repair
Providing structured diagnostic payloads (exact `javac` compiler error line numbers and failed test case inputs/outputs) to the model provides actionable context:
- Compiler error payloads enable models to localize the failing token.
- Isolating single-pass baseline results from repair-assisted results prevents confounding raw model quality with multi-turn prompt engineering.

---

## 3. Dataset Integrity & Anti-Mislabeling Audit

As documented in `docs/dataset_audit.md`:
- **CodeXGLUE (Microsoft):** The canonical CodeXGLUE code-to-code translation dataset is **Java ↔ C#**, NOT Python ↔ Java. TransCode Lab explicitly audited this and prevented mislabeling.
- **TransCode Lab Curated Suite:** Evaluates 8 canonical parallel algorithms with 34 deterministic test cases covering integer overflow, float precision, string Unicode, and negative integer division truncation differences.

