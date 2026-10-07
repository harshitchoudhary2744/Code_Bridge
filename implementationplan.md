# implementationplan.md
# CodeBridge — Implementation Plan

## 1. Implementation Principle

Build the project in the following order:

```text
UI
 ↓
API
 ↓
Simple translation service
 ↓
Structure extraction
 ↓
Validation
 ↓
Fine-tuning/evaluation
 ↓
Correction loop
 ↓
Final polish
```

Do not build all advanced features at once.

---

# Phase 1 — Project Setup

## Goal

Create a working React + FastAPI application.

### Tasks

1. Create React/Vite frontend.
2. Create FastAPI backend.
3. Add CORS configuration for local development.
4. Add `/api/health`.
5. Connect frontend to backend.
6. Create `.gitignore`.
7. Create README with setup commands.

### Deliverable

The browser displays:

```text
CodeBridge
Backend: Connected
```

---

# Phase 2 — Frontend

## Goal

Build the translation interface before connecting the real model.

### UI

Create:

```text
┌──────────────────────────────────────────────────────┐
│ CodeBridge                              ● Ready      │
├──────────────────────────────────────────────────────┤
│ Python ▼          →          Java ▼                  │
├──────────────────────┬───────────────────────────────┤
│ SOURCE CODE          │ TRANSLATED CODE               │
│                      │                               │
│                      │                               │
│                      │                               │
├──────────────────────┴───────────────────────────────┤
│ [Translate] [Clear] [Load Example]                   │
├──────────────────────────────────────────────────────┤
│ Validation                                            │
│ Syntax      ✓                                         │
│ Compilation ✓                                         │
│ Tests       3/3                                       │
└──────────────────────────────────────────────────────┘
```

### Tasks

1. Language selectors.
2. Source editor.
3. Target output editor.
4. Translate button.
5. Loading state.
6. Error notification.
7. Validation result cards.
8. Copy button.
9. Sample-code loader.

### Deliverable

Frontend works with mocked translation data.

---

# Phase 3 — Backend API

## Goal

Replace mock data with a proper REST API.

### Tasks

1. Create Pydantic request schema.
2. Create translation response schema.
3. Implement `/api/translate`.
4. Add input validation.
5. Add error handling.
6. Connect frontend to API.

### Deliverable

Frontend sends:

```json
{
  "source_language": "python",
  "target_language": "java",
  "code": "..."
}
```

and receives a valid JSON response.

---

# Phase 4 — Transformer Service

## Goal

Integrate the encoder-decoder Transformer.

### Tasks

1. Install PyTorch and Transformers.
2. Load CodeT5-small.
3. Load tokenizer.
4. Create `translator.py`.
5. Implement model-input formatting.
6. Implement generation.
7. Decode generated tokens.
8. Add model-loading cache so the model is loaded once.

### Important

Do not train from scratch.

Start with the pretrained model and make the code path work first.

### Deliverable

The backend can call:

```python
translate_code(source_code, source_language, target_language)
```

and return generated code.

---

# Phase 5 — Structure Extraction

## Goal

Implement the research-inspired structural feature.

### Tasks

1. Integrate Tree-sitter.
2. Load Python and Java grammars.
3. Parse source code.
4. Walk the tree.
5. Extract selected node categories.
6. Convert them into a small text summary.
7. Add the summary to the model input.

### Example

Input:

```python
def max_value(a, b):
    if a > b:
        return a
    return b
```

Structure:

```text
FUNCTION
PARAMETER
IF
COMPARISON
RETURN
RETURN
```

### Deliverable

Two modes work:

```text
Baseline:
Code → Transformer

Structural:
Structure + Code → Transformer
```

---

# Phase 6 — Validation

## Goal

Check whether generated code is actually usable.

### Tasks

### Python

1. Create temporary file.
2. Run syntax validation.
3. Capture error.
4. Delete file.

### Java

1. Create temporary source file.
2. Compile with `javac`.
3. Capture error.
4. Delete files.

### Deliverable

UI displays:

```text
Syntax: PASS
Compilation: PASS
```

or a clear error.

---

# Phase 7 — Test Execution

## Goal

Add simple execution-based correctness checking.

### Tasks

1. Define a small JSON test format.
2. Accept optional test cases.
3. Generate/use a test runner.
4. Run with a timeout.
5. Capture result.
6. Compare expected and actual output.
7. Return test statistics.

Example:

```json
{
  "function": "add",
  "inputs": [[2, 3]],
  "expected": [5]
}
```

### Deliverable

```text
Tests: 1/1 PASS
```

---

# Phase 8 — Fine-Tuning Pipeline

## Goal

Make the ML experiment reproducible.

### Tasks

1. Define JSONL dataset format.
2. Implement preprocessing.
3. Add tokenizer preprocessing.
4. Fine-tune CodeT5-small.
5. Save checkpoint.
6. Load checkpoint in backend.
7. Add evaluation script.

### Training modes

Run:
- Python → Java
- Java → Python

Keep the initial dataset and experiment sizes small enough for student hardware or a notebook GPU.

Do not report fixed accuracy values in the README until the model is actually trained and evaluated.

---

# Phase 9 — Research Evaluation

## Goal

Compare the three project modes.

### Experiment A

```text
Baseline
Code → Transformer → Code
```

### Experiment B

```text
Structural
Code + Structure → Transformer → Code
```

### Experiment C

```text
Structural + Validation
Code + Structure
       ↓
Transformer
       ↓
Validation
```

### Record

For every experiment:

```text
Number of test samples
Compilation/Syntax success
Unit-test pass rate
BLEU/CodeBLEU, if used
```

Use the same test set when comparing models.

### Deliverable

A results table:

| System | Syntax/Compilation | Tests Passed | BLEU/CodeBLEU |
|---|---:|---:|---:|
| Baseline | measured value | measured value | measured value |
| Structural | measured value | measured value | measured value |
| Structural + Validation | measured value | measured value | measured value |

Never invent values.

---

# Phase 10 — Correction Loop

## Goal

Fix one validation failure automatically.

### Flow

```text
Generate
   ↓
Validate
   ↓
PASS → finish
FAIL
   ↓
Send generated code + error to model
   ↓
Regenerate once
   ↓
Validate
```

### Deliverable

UI displays:

```text
Correction attempted: Yes
Final validation: PASS
```

or:

```text
Correction attempted: Yes
Final validation: FAIL
```

---

# Phase 11 — Testing and Cleanup

### Tasks

1. Test every API.
2. Test empty input.
3. Test invalid source code.
4. Test unsupported languages.
5. Test Java compiler unavailable.
6. Test model unavailable.
7. Test validation timeout.
8. Remove dead code.
9. Add comments only where useful.
10. Ensure the application can be started with clear commands.

---

# Phase 12 — Viva Preparation

Create a `VIVA_NOTES.md` file containing simple answers for:

### ML

- What is an encoder?
- What is a decoder?
- What is self-attention?
- Why Transformer instead of RNN?
- What is sequence-to-sequence learning?
- Why use a pretrained model?
- What is fine-tuning?
- What is tokenization?

### Project

- Why is code translation difficult?
- Why is BLEU not enough?
- Why use structure information?
- Why use Tree-sitter?
- Why compile generated code?
- Why execute test cases?
- What is the research gap?
- What is the baseline?
- What is your contribution?
- What are the limitations?

### Architecture

- Why React?
- Why FastAPI?
- Why no database?
- Why CodeT5?
- Why only two languages?
- Why function-level/short code?
- Why only one correction attempt?

---

# Final Definition of Done

The project is complete when:

- frontend works,
- backend works,
- Transformer works,
- structure extraction works,
- validation works,
- simple tests work,
- correction loop works,
- experiments can compare baseline vs structural vs validated systems,
- README explains setup,
- code is understandable line-by-line.
