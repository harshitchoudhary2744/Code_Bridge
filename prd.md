# PRD.md
# Automated Code Translation System — Product Requirements Document

## 1. Project Title

**System for Automated Code Translation Between Programming Languages Using an Encoder-Decoder Transformer**

Working product name: **CodeBridge**

---

## 2. Product Goal

Build a simple web application that translates short, self-contained programs/functions between programming languages using an **encoder-decoder Transformer**.

The main research idea is not only to generate target code, but also to **check whether the generated code is valid**.

The MVP will support:

- Python → Java
- Java → Python

The architecture should make it possible to add more languages later, but **do not implement C++, repository-level translation, LLVM IR, or complex retrieval in the MVP**.

---

## 3. Research Motivation

The project is based on problems discussed in previous code-translation research:

1. **Generated code can be syntactically or semantically wrong.**
   - TransCoder shows that generated translations can contain compilation errors and that text similarity alone is not enough to judge correctness.

2. **Automatically generated tests are useful but imperfect.**
   - TransCoder-ST uses automated unit tests to filter and improve translated code, while also discussing cases where tests do not perfectly represent the intended behavior.

3. **Program structure can provide information beyond raw tokens.**
   - TransCoder-IR investigates compiler representations to provide additional semantic information.

4. **Complex dependencies are difficult for code translators.**
   - Program Translation via Code Distillation discusses difficulties involving complex dependencies and hallucinated method/API information.

Therefore, CodeBridge focuses on a manageable combination of:
- encoder-decoder Transformer translation,
- lightweight code-structure information,
- compilation/syntax validation,
- simple test execution,
- clear error reporting.

---

## 4. Target Users

Primary user:
- Student/developer who wants to understand or convert a small piece of code.

The system is intended for **short educational/self-contained code**, not production-scale repository migration.

---

## 5. MVP User Flow

1. User opens CodeBridge.
2. User selects source language.
3. User selects target language.
4. User pastes code.
5. User clicks **Translate**.
6. Backend extracts lightweight structural information.
7. Encoder-decoder Transformer generates target code.
8. Validator checks the generated code.
9. UI shows:
   - translated code,
   - validation result,
   - errors/warnings,
   - execution/test result when tests are available.
10. User can copy the final code.

---

## 6. Core Features

### F1 — Code Editor

Provide a code editor with:
- syntax highlighting,
- line numbers,
- clear button,
- copy button,
- sample-code button.

Keep the editor simple. Do not build a full IDE.

### F2 — Language Selection

Dropdowns:
- Source: Python / Java
- Target: Python / Java

Do not allow source and target to be the same.

### F3 — Transformer Translation

Use a pretrained **encoder-decoder Transformer** as the base model.

Recommended implementation:
- Hugging Face Transformers
- PyTorch
- `Salesforce/codet5-small`

The model is an encoder-decoder model and can be fine-tuned for code-to-code translation.

The translation layer must be isolated in a Python service so the model can be replaced later.

### F4 — Lightweight Structural Information

Before translation, analyze the source code using **Tree-sitter**.

Extract only simple information such as:
- function definitions,
- class definitions,
- loops,
- conditional statements,
- function/method calls,
- assignments,
- return statements.

Do not expose the full parse tree to the user.

The structural information should be converted into a compact text representation and supplied to the model as additional context.

Example:

```text
[LANGUAGE=PYTHON]
[STRUCTURE]
FUNCTION
IF
LOOP
CALL
RETURN
[CODE]
def sum_even(numbers):
    ...
```

Important: this is a **lightweight structural feature**, not a full compiler IR.

### F5 — Syntax / Compilation Validation

After generation:

For Python:
- run a syntax check using Python's compiler facilities.

For Java:
- attempt compilation using the locally installed JDK.

The validator should return:
- valid / invalid,
- compiler/syntax error,
- error line if available.

### F6 — Basic Execution Tests

Allow simple test cases for short, self-contained code.

Example:

```json
{
  "function": "sum_even",
  "inputs": [[1, 2, 3, 4]],
  "expected": [6]
}
```

The backend executes only locally in a temporary directory and uses a timeout.

The MVP must clearly state that arbitrary untrusted code should **not** be exposed through a public production deployment.

### F7 — Validation Summary

Show a simple report:

```text
Translation: Generated
Syntax: PASS
Compilation: PASS
Tests: 3/3 PASS
Overall: VALID
```

Or:

```text
Translation: Generated
Syntax: FAIL
Compilation: SKIPPED
Tests: SKIPPED
Overall: NEEDS CORRECTION
```

### F8 — Error Explanation

Show the actual validation error in readable language.

Example:

```text
Java compilation failed:
Line 8: cannot find symbol
```

Do not pretend the system knows the semantic intent when it cannot determine it.

---

## 7. Research Experiment Features

The application should support three modes for evaluation.

### Mode A — Baseline

```text
Code → Transformer → Target Code
```

No structural context.

### Mode B — Structural

```text
Code + Structure → Transformer → Target Code
```

### Mode C — Structural + Validation

```text
Code + Structure
      ↓
Transformer
      ↓
Target Code
      ↓
Validation
```

This allows the project to compare whether the added components improve reliability.

---

## 8. Evaluation Metrics

The project should report:

### Primary metrics
- Compilation/syntax success rate
- Unit-test pass rate

### Secondary metric
- BLEU or CodeBLEU, if an evaluation script is available

Do not claim that BLEU/CodeBLEU alone proves semantic correctness.

For every experiment, report the number of test examples used.

---

## 9. Scope Boundaries

### Included

- Python ↔ Java
- short self-contained code
- encoder-decoder Transformer
- fine-tuning pipeline
- lightweight structural extraction
- syntax/compilation checking
- small test execution
- simple correction loop

### Excluded from MVP

- full GitHub repository translation
- multi-file dependency graphs
- LLVM IR
- automatic migration of external libraries
- cloud code execution
- autonomous coding agent
- large language model API dependency
- complex RAG system
- authentication/payment
- database

---

## 10. Simple Correction Loop

A small correction loop may be implemented:

```text
Generate
   ↓
Validate
   ↓
Pass → Return
Fail → Give error to correction prompt
   ↓
Regenerate once
   ↓
Validate again
```

Maximum correction attempts: **1** in the MVP.

This prevents an endless generation loop and keeps the behavior easy to explain.

---

## 11. Success Criteria

The project is successful when:

1. A user can enter supported Python or Java code.
2. The system can generate target-language code using an encoder-decoder Transformer.
3. Structural information can be extracted and optionally used.
4. Generated code can be syntax-checked/compiled.
5. Simple tests can be executed.
6. The UI clearly shows whether the translation passed validation.
7. Baseline and enhanced modes can be compared experimentally.
8. The complete architecture can be explained in a viva without requiring knowledge of LLVM, distributed training, or repository-level program analysis.

---

## 12. Academic Positioning

The project should be presented as:

> A practical investigation of whether lightweight structural information and post-translation validation can improve the reliability of encoder-decoder Transformer-based code translation.

Do not claim to have invented Transformer-based code translation.

---

## 13. References Used for Research Direction

- Rozière et al., **Unsupervised Translation of Programming Languages**, NeurIPS 2020.
- Rozière et al., **Leveraging Automated Unit Tests for Unsupervised Code Translation**, ICLR 2022.
- Szafraniec et al., **Code Translation with Compiler Representations**, ICLR 2023.
- Huang et al., **Program Translation via Code Distillation**, EMNLP 2023.
- Xue et al., **An Interpretable Error Correction Method for Enhancing Code-to-Code Translation**, ICLR 2024.
- Guizzo et al., **Mutation Analysis for Evaluating Code Translation**, Empirical Software Engineering, 2024.
