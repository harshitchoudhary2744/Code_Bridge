# CodeBridge: Automated Code Translation System

**System for Automated Code Translation Between Programming Languages Using an Encoder-Decoder Transformer**

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.0+-EE4C2C.svg)](https://pytorch.org/)
[![Transformers](https://img.shields.io/badge/HuggingFace-CodeT5--small-yellow.svg)](https://huggingface.co/Salesforce/codet5-small)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/license-Academic-green.svg)]()

---

## 1. Overview

**CodeBridge** is an educational, research-oriented code translation system that translates short, self-contained functions bidirectionally between **Python** and **Java** using an **encoder-decoder Transformer** (`Salesforce/codet5-small`).

Beyond simply generating code, CodeBridge investigates two key research questions:
1. **Structural AST Guidance**: Can lightweight syntax-tree summaries extracted via **Tree-sitter** (`FUNCTION`, `PARAMETER`, `IF`, `LOOP`, `RETURN`) improve sequence-to-sequence translation compared to raw token sequences?
2. **Automated Verification & One-Shot Repair**: Can automated syntax analysis, target-language compilation (`javac`), and sandboxed execution catch translation errors and guide a bounded one-shot automatic correction loop?

---

## 2. Architecture & Data Flow

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        React Frontend (Vite)                           │
│  - Dual Monaco Editors (Source & Target)                               │
│  - Tree-sitter Structure Tag Viewer                                    │
│  - Validation Report (Syntax, javac, Test suite)                       │
│  - Research Mode Switcher (Baseline vs Structural vs Validated)        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        FastAPI REST Backend                            │
│  GET /api/health    GET /api/languages    POST /api/translate          │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
         ┌──────────────────────────┼──────────────────────────┐
         ▼                          ▼                          ▼
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│ Tree-sitter AST  │      │  CodeT5 Encoder  │      │ Validation Svc   │
│ Structure Parser │      │  CodeT5 Decoder  │      │ - Python ast     │
│ Python & Java    │      │  (Seq2Seq LM)    │      │ - JDK javac      │
└────────┬─────────┘      └────────┬─────────┘      │ - Subprocess     │
         │                         │                └────────┬─────────┘
         └─────────────────────────┼─────────────────────────┘
                                   ▼
                   ┌──────────────────────────────┐
                   │    Correction Loop Service   │
                   │    (Bounded 1-Shot Retry)    │
                   └───────────────┬──────────────┘
                                   │
                                   ▼
                          JSON Response to UI
```

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, Monaco Editor (`@monaco-editor/react`), Lucide React icons, Vanilla CSS with dark developer theme.
- **Backend API**: Python 3, FastAPI, Pydantic, Uvicorn.
- **Machine Learning**: PyTorch, Hugging Face `transformers`, `Salesforce/codet5-small` (60M parameter encoder-decoder architecture).
- **Code Structure Parsing**: `tree-sitter`, `tree-sitter-python`, `tree-sitter-java`.
- **Validation**: Python native `ast` compiler facilities, local JDK `javac 17+` compiler, sandboxed subprocess test execution with 5-second execution limits.
- **Storage**: Stateless architecture with JSONL training data and local Hugging Face checkpoints. No database required.

---

## 4. Repository Structure

```text
codebridge/
│
├── frontend/                     # React + Vite application
│   ├── src/
│   │   ├── components/           # Header, CodeEditor, ValidationPanel, etc.
│   │   ├── services/api.js       # Typed HTTP client
│   │   ├── utils/samples.js      # Educational sample programs
│   │   ├── App.jsx               # Main workspace
│   │   ├── App.css               # IDE dark theme styling
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── backend/                      # FastAPI Python backend
│   ├── app/
│   │   ├── main.py               # Application entrypoint & CORS setup
│   │   ├── routes/translate.py   # Translation, structure, and validation endpoints
│   │   ├── services/
│   │   │   ├── translator.py     # CodeT5 inference & prompt builder
│   │   │   ├── structure.py      # Tree-sitter AST category extraction
│   │   │   ├── validator.py      # Python ast & Java javac compiler sandbox
│   │   │   └── corrector.py      # One-shot automatic correction loop
│   │   └── schemas/translation.py# Pydantic request/response models
│   ├── requirements.txt          # Python dependencies
│   └── tests/                    # Unit and integration test suite
│
├── ml/                           # ML Training & Research Evaluation
│   ├── data/                     # train.jsonl, validation.jsonl, test.jsonl
│   ├── preprocess.py             # Dataset loader & AST token formatter
│   ├── train.py                  # Supervised fine-tuning pipeline
│   ├── evaluate.py               # Empirical comparison script
│   └── evaluation_results.json   # Actual measured evaluation output
│
├── models/
│   └── codet5_translation/       # Fine-tuned model checkpoint directory
│
├── samples/                      # Standalone sample programs
│   ├── python/                   # add.py, factorial.py, fibonacci.py, etc.
│   └── java/                     # Add.java, Factorial.java, etc.
│
├── README.md                     # Project documentation
├── VIVA_NOTES.md                 # Examination & Viva defense guide
└── .gitignore
```

---

## 5. Installation & Setup

### Prerequisites
- Python 3.10+ installed
- Node.js 18+ and npm installed
- Java Development Kit (JDK 17 or higher) installed with `javac` on your system PATH (for Java compilation)

### 1. Backend Setup

```bash
# From workspace root:
pip install -r backend/requirements.txt
```

Verify backend installation and run unit tests:
```bash
python -m pytest backend/tests
```

Start the FastAPI server:
```bash
python -m uvicorn backend.app.main:app --reload --port 8000
```
The API is available at `http://localhost:8000`. OpenAPI documentation is available at `http://localhost:8000/docs`.

### 2. Frontend Setup

In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
The application opens at `http://localhost:5173`.

---

## 6. Research Experiment Modes

CodeBridge includes three distinct experiment modes accessible directly in the UI:

| Experiment Mode | Pipeline Formula | Description |
|---|---|---|
| **Mode A: Baseline** | $\text{Code} \rightarrow \text{Transformer} \rightarrow \text{Code}$ | Raw sequence-to-sequence translation without structural context. |
| **Mode B: Structural** | $\text{Code} + \text{Tree-sitter AST} \rightarrow \text{Transformer} \rightarrow \text{Code}$ | Injects high-level structural category tokens (`FUNCTION`, `PARAMETER`, `IF`, `LOOP`, `RETURN`) into the model prompt. |
| **Mode C: Structural + Validation** | $\text{Code} + \text{Structure} \rightarrow \text{Transformer} \rightarrow \text{Compiler Validation}$ | Proposed system: structural generation verified with `javac`/`ast` and repaired via one-shot correction if needed. |

---

## 7. Model Training & Evaluation

### Fine-Tuning Pipeline
To reproduce the fine-tuning of `Salesforce/codet5-small` on aligned Python $\leftrightarrow$ Java function pairs:
```bash
python ml/train.py --epochs 3 --batch_size 4 --lr 5e-5 --output_dir models/codet5_translation
```

### Empirical Evaluation
Run the automated benchmark across the test set (`ml/data/test.jsonl`):
```bash
python ml/evaluate.py
```

### Actual Measured Results
Below are the actual measured results on the test suite using our fine-tuned CodeT5 checkpoint:

| Pipeline Configuration | Samples | Syntax / Compilation Pass | Pass Rate |
|---|:---:|:---:|:---:|
| **Baseline** | 6 | 2 / 6 | **33.3%** |
| **Structural** | 6 | 0 / 6 | **0.0%** |
| **Structural + Validation (1-Shot Repair)** | 6 | 1 / 6 | **16.7%** |

*Note: Results depend on dataset size, training epochs, and checkpoint capacity. CodeBridge reports only real empirical measurements.*

---

## 8. Safety & Controlled Execution

Because CodeBridge compiles and executes translated programs:
- Code runs in **isolated temporary directories** created with `tempfile.mkdtemp`.
- Execution uses `subprocess.run(shell=False)` with direct executable calls.
- A **strict 5-second timeout** prevents infinite loops and resource starvation.
- Temporary source files, `.class` bytecodes, and runners are automatically cleaned up immediately following execution.
- CodeBridge is designed for local educational exploration and research, not untrusted public deployment.

---

## 9. Academic References

1. Rozière et al., *Unsupervised Translation of Programming Languages* (TransCoder), NeurIPS 2020.
2. Rozière et al., *Leveraging Automated Unit Tests for Unsupervised Code Translation* (TransCoder-ST), ICLR 2022.
3. Szafraniec et al., *Code Translation with Compiler Representations* (TransCoder-IR), ICLR 2023.
4. Huang et al., *Program Translation via Code Distillation*, EMNLP 2023.
5. Xue et al., *An Interpretable Error Correction Method for Enhancing Code-to-Code Translation*, ICLR 2024.
6. Guizzo et al., *Mutation Analysis for Evaluating Code Translation*, Empirical Software Engineering, 2024.

---

## 10. License

Developed for academic research and educational demonstration.
