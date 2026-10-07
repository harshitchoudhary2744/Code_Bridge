# TRD.md
# Automated Code Translation System — Technical Requirements Document

## 1. Technical Objective

Create a small full-stack system with:

```text
React Frontend
      ↓ HTTP/JSON
FastAPI Backend
      ↓
Translation Service
      ↓
CodeT5 Encoder-Decoder Transformer
      ↓
Validation Service
      ↓
Result
```

The implementation should favor readability over production complexity.

---

## 2. Recommended Tech Stack

### Frontend

- React
- Vite
- JavaScript
- CSS
- Monaco Editor or another lightweight code editor package

Why:
- easy to understand,
- quick development,
- good code-editor experience,
- no Next.js requirement.

### Backend

- Python
- FastAPI
- Pydantic

FastAPI is used only as a thin REST API layer.

### ML

- PyTorch
- Hugging Face Transformers
- Hugging Face Tokenizers
- `Salesforce/codet5-small`

CodeT5-small is an encoder-decoder Transformer and can be loaded through `AutoTokenizer` and `AutoModelForSeq2SeqLM`.

### Code Structure Parser

- Tree-sitter
- Python grammar
- Java grammar

Use Tree-sitter only to extract a few structural node types.

### Validation

Python:
- Python syntax/compiler facilities
- Python subprocess execution for controlled tests

Java:
- JDK / `javac`
- Java runtime for controlled tests

### Storage

No database is required for the MVP.

Use:
- JSON for configuration,
- local files for datasets,
- local model/checkpoint directory.

---

## 3. Project Structure

Use this structure:

```text
codebridge/
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   │   └── translate.py
│   │   ├── services/
│   │   │   ├── translator.py
│   │   │   ├── structure.py
│   │   │   ├── validator.py
│   │   │   └── corrector.py
│   │   ├── schemas/
│   │   │   └── translation.py
│   │   └── utils/
│   ├── requirements.txt
│   └── tests/
│
├── ml/
│   ├── data/
│   │   ├── train.jsonl
│   │   ├── validation.jsonl
│   │   └── test.jsonl
│   ├── train.py
│   ├── evaluate.py
│   └── preprocess.py
│
├── models/
│   └── codet5_translation/
│
├── samples/
│   ├── python/
│   └── java/
│
├── README.md
└── .gitignore
```

---

## 4. Input Contract

Translation request:

```json
{
  "source_language": "python",
  "target_language": "java",
  "code": "def add(a, b):\n    return a + b",
  "use_structure": true,
  "run_validation": true,
  "tests": []
}
```

---

## 5. Output Contract

Example:

```json
{
  "translated_code": "public static int add(int a, int b) { return a + b; }",
  "source_language": "python",
  "target_language": "java",
  "structure_used": true,
  "validation": {
    "syntax": true,
    "compilation": true,
    "tests_passed": 0,
    "tests_total": 0,
    "status": "valid",
    "message": "Generated code passed validation."
  },
  "correction_attempted": false
}
```

For failures, return explicit error fields.

---

## 6. API Endpoints

### GET `/api/health`

Returns:

```json
{
  "status": "ok"
}
```

### GET `/api/languages`

Returns supported languages.

### POST `/api/translate`

Main endpoint.

Input:
- source language,
- target language,
- code,
- structure flag,
- validation flag,
- optional tests.

Output:
- translation,
- validation,
- correction status.

### POST `/api/analyze-structure`

Optional development/debug endpoint.

Returns the extracted structure summary.

### POST `/api/validate`

Optional endpoint for validating manually supplied target code.

---

## 7. Translation Pipeline

```text
1. Receive source code
2. Validate source language selection
3. Extract lightweight structure
4. Build model input
5. Tokenize
6. Run encoder-decoder model
7. Decode generated tokens
8. Clean formatting
9. Validate target code
10. If validation fails, perform one correction attempt
11. Validate again
12. Return result
```

---

## 8. Model Input Format

Baseline:

```text
translate python to java:
<source code>
```

Structural:

```text
translate python to java:
[STRUCTURE]
FUNCTION
IF
RETURN
[CODE]
<source code>
```

The exact prompt/template should be stored in one Python module so it is easy to change.

---

## 9. Model Usage

Use a pretrained encoder-decoder model as the starting point:

```python
AutoTokenizer.from_pretrained("Salesforce/codet5-small")
AutoModelForSeq2SeqLM.from_pretrained("Salesforce/codet5-small")
```

For the research experiment, fine-tune the model on aligned code pairs.

Do not train a Transformer from random initialization.

This keeps the project computationally and conceptually manageable.

---

## 10. Dataset Format

Use JSONL:

```json
{"source_language":"python","target_language":"java","source":"def add(a,b):\n return a+b","target":"..."}
{"source_language":"java","target_language":"python","source":"...","target":"..."}
```

The dataset must contain **equivalent programs/functions**.

Use a documented, academically appropriate code-translation dataset where available, or a small manually verified educational corpus for demonstration.

Do not invent benchmark scores or dataset statistics.

---

## 11. Training Requirements

Implement:

- preprocessing,
- train/validation/test split handling,
- tokenization,
- fine-tuning,
- checkpoint saving,
- evaluation.

Keep training configuration small and readable.

The training script must support:

```text
python train.py
```

with simple command-line arguments or a small configuration section.

---

## 12. Structure Extraction

Tree-sitter produces a syntax tree.

The system should inspect only selected nodes and produce a compact list such as:

```text
FUNCTION
PARAMETER
ASSIGNMENT
IF
LOOP
CALL
RETURN
```

Do not send a giant tree dump to the model.

Create:

```python
extract_structure(code, language) -> list[str]
```

Keep this function isolated and easy to explain.

---

## 13. Validation Design

### Python

1. Write generated code to a temporary file.
2. Perform syntax checking.
3. If tests are provided, execute in a controlled subprocess.
4. Apply a timeout.
5. Capture stdout/stderr.
6. Delete temporary files.

### Java

1. Write generated code to a temporary `.java` file.
2. Compile with `javac`.
3. Capture compiler errors.
4. If a test runner is available, run it.
5. Apply a timeout.
6. Delete temporary files and compiled artifacts.

---

## 14. Correction Design

The correction service receives:

```text
source code
generated target code
validation error
```

It then asks the same model to regenerate a corrected version.

Only one automatic correction attempt is allowed.

Do not create a separate large correction model in the MVP.

---

## 15. Security Constraints

Because code execution is involved:

- only run locally for the project demo,
- use temporary directories,
- enforce short timeouts,
- never run commands through a shell when a direct executable call is possible,
- do not allow arbitrary OS commands from the frontend,
- document that this is a research/demo tool, not a public untrusted-code execution service.

---

## 16. Error Handling

Backend must never crash because of bad user input.

Handle:
- empty code,
- unsupported language,
- invalid source syntax,
- model loading failure,
- generation failure,
- compilation error,
- timeout,
- missing JDK,
- missing Python runtime.

Frontend should show friendly messages.

---

## 17. Testing

### Unit tests

Test:
- language validation,
- structure extraction,
- model-input formatting,
- Python syntax validation,
- Java compilation validation,
- API schema validation.

### Integration tests

Test:

```text
Frontend → API → Translator → Validator → API response
```

### Demo tests

Prepare 5–10 short examples:
- arithmetic,
- factorial,
- Fibonacci,
- max/min,
- array/list processing,
- simple condition,
- simple loop.

Use simple examples that are easy to explain in viva.

---

## 18. Non-Functional Requirements

### Simplicity

Code must be modular but not over-engineered.

### Explainability

Every ML-related step must have:
- a short comment,
- a simple README explanation.

### Reproducibility

Provide:
- requirements file,
- training instructions,
- sample data format,
- sample code,
- model path/configuration.

### Performance

No strict production latency target is required.

The application should provide a visible loading state during generation.

---

## 19. Things Antigravity Must NOT Add

Do not add:
- Next.js
- Node/Python microservice sprawl
- PostgreSQL/MongoDB
- authentication
- Docker orchestration
- Kubernetes
- Redis
- Kafka
- cloud deployment as a requirement
- vector database
- RAG pipeline
- LLVM
- repository-wide graph analysis
- autonomous multi-agent architecture

The project must remain small enough for one student to explain line-by-line.
