# CodeBridge — Viva & Project Defense Guide

This guide contains concise, clear, and beginner-friendly answers to examination and viva questions about the CodeBridge project.

---

## 1. Transformer & Deep Learning Fundamentals

### What is a Transformer?
A Transformer is a neural network architecture introduced by Vaswani et al. (2017) based entirely on **self-attention mechanisms**, dispensing with recurrence (RNNs) and convolutions. It processes input sequences in parallel rather than token-by-token.

### What is an Encoder?
The encoder is a stack of Transformer layers that processes the complete source program (bidirectionally). It produces a continuous vector representation (context embeddings) capturing the relationships between all tokens in the source code.

### What is a Decoder?
The decoder is a stack of Transformer layers that autoregressively generates the target program token-by-token. At each step, it attends both to the previously generated target tokens (masked self-attention) and to the encoder's contextual representations (cross-attention).

### What is Self-Attention?
Self-attention allows each token in a sequence to dynamically weigh and attend to every other token in the sequence. For example, in code, an identifier `a` in `return a + b` attends strongly to `a` in the parameter definition `def add(a, b)`.

### Why an Encoder-Decoder Architecture for Code Translation?
Code translation is inherently a **sequence-to-sequence (Seq2Seq)** task where the input language syntax differs substantially from the output language. 
- An encoder-decoder architecture (like **CodeT5**, T5, or BART) is ideal because the encoder encodes the source language globally, and the decoder generates grammatically structured code in the target language.
- Pure decoder-only models (like GPT) are autoregressive causal models, whereas encoder-decoder models excel at conditioned cross-lingual transduction.

### Why is Code Translation a Sequence-to-Sequence Problem?
Because source code in language $A$ (e.g., Python) has a variable sequence length, different syntactic rules, and differing keyword layouts compared to language $B$ (e.g., Java). The model must map a sequence of tokens in language $A$ into an equivalent sequence of tokens in language $B$.

### What is Tokenization?
Tokenization is the process of breaking raw code characters into discrete numerical tokens (vocabulary indices). CodeBridge uses Byte-Pair Encoding (BPE) via CodeT5's tokenizer, which splits common keywords and subword fragments (e.g., camelCase or snake_case identifiers) into subword units.

### What is Pretraining vs. Fine-Tuning?
- **Pretraining**: Training the base model on vast amounts of unlabelled source code (e.g., masked identifier prediction, masked span denoising) to learn general programming language semantics.
- **Fine-Tuning**: Supervised training of the pretrained model on aligned code pairs (Python $\leftrightarrow$ Java) to adapt it specifically to bidirectional translation.

### Why Use a Pretrained Model (`Salesforce/codet5-small`)?
Training a Transformer from scratch requires millions of lines of code and hundreds of GPU hours. Using `Salesforce/codet5-small` provides an already competent code-aware foundation (60 million parameters) that can be fine-tuned quickly on moderate student hardware.

---

## 2. Project Motivation & Research Context

### What Problem Are You Solving?
Translating code across languages (e.g., migrating Python prototypes to strongly-typed Java) is difficult and prone to syntax errors, mismatched types, and missing compiler constructs. Standard generative models often produce code that *looks* right but fails compilation. CodeBridge improves translation reliability by integrating **lightweight structural AST guidance** with **automated compiler validation** and a **one-shot correction loop**.

### Why is Code Translation Difficult?
1. **Syntactic Strictness**: Unlike natural language where minor grammatical mistakes still convey meaning, a single missing semicolon or brace in code breaks compilation.
2. **Type Systems**: Python is dynamically typed; Java is statically and strongly typed. The model must infer types ($int$, $double$, $String$) that were never explicitly declared in Python.
3. **Control-flow & Standard Libraries**: Idiomatic constructs (e.g., `range(1, n)` vs `for (int i=1; i<=n; i++)`) must be mapped correctly without hallucinating libraries.

### What is the Research Gap?
Prior research (e.g., Facebook AI's *TransCoder*, *TransCoder-ST*, *TransCoder-IR*):
- Demonstrated that pure token-based models frequently generate non-compiling code.
- Demonstrated that text-similarity metrics (like BLEU) correlate poorly with executable correctness.
- Showed that automated testing and compiler representations improve quality, but often required heavy LLVM infrastructures or massive server fleets.
**CodeBridge addresses this gap** by exploring a lightweight, developer-accessible pipeline: using Tree-sitter for non-invasive structural guidance and local compiler validation (`javac`/Python `ast`) for immediate verification.

### What is Your Baseline?
The **Baseline Mode** is direct token-to-token translation:
$$\text{Source Code} \longrightarrow \text{CodeT5} \longrightarrow \text{Target Code}$$
without AST structural tokens and without validation.

### What is Your Proposed Improvement?
1. **Structural Mode**: Augmenting the model prompt with high-level architectural tokens (`FUNCTION`, `PARAMETER`, `IF`, `LOOP`, `RETURN`) extracted via Tree-sitter.
2. **Structural + Validation Mode**: Coupling the structural generation with automated syntax analysis, compilation via `javac`, and a bounded one-shot correction attempt if errors occur.

### Why Tree-sitter instead of LLVM IR?
- **LLVM IR** requires fully compiling the code, resolving external header files, and platform-specific compiler toolchains, which fails on short, self-contained snippets.
- **Tree-sitter** is a robust, incremental parser that produces concrete syntax trees across both Python and Java in milliseconds, even on partial or standalone functions.

### Why Validate Generated Code?
Generative models are probabilistic; they predict the next token based on statistical likelihood, not formal grammar proofs. Validation grounds the output against the ground truth of the target language compiler (`javac`) or syntax analyzer (`ast.parse`).

### Why Isn't BLEU Sufficient for Code Translation?
BLEU measures $n$-gram lexical overlap against a reference string. A program can have a 95% BLEU score but fail compilation because of a single missing semicolon, or conversely have a lower BLEU score due to renaming variables while being semantically 100% correct and passing all test suites.

### What Does the One-Shot Correction Loop Do?
When generated code fails validation:
1. The error message (e.g., `Line 3: ';' expected`) and the failed code are fed back to the model in a corrective prompt.
2. The model regenerates the code.
3. The newly generated code is re-validated.
4. If it passes, the corrected code is returned; if it fails, the diagnostic report is presented transparently.

### Why Exactly ONE Correction Attempt?
To guarantee termination, avoid non-deterministic infinite loops, preserve latency, and keep the system simple and verifiable during demonstration.

### Why Focus on Short, Self-Contained Functions?
Short functions (e.g., mathematical logic, conditionals, loops) permit deterministic, fast compilation and unit testing without needing complex multi-file dependency resolution, third-party package managers, or whole-repository graph analysis.

### What Are the Project's Limitations?
1. It does not handle large, multi-file codebases or complex external libraries (e.g., NumPy $\leftrightarrow$ Apache Commons).
2. The small model size (60M parameters) means complex algorithms may require larger datasets or larger checkpoints.
3. Test case coverage is bounded to user-provided or sample unit tests.

---

## 3. System Architecture & Engineering

### Explain the Architectural Pipeline:
```text
React Frontend (Vite, Monaco Editor)
       ↓ HTTP / JSON
FastAPI Backend (REST Service)
       ↓
Tree-sitter Parser (Extracts FUNCTION, PARAMETER, IF, LOOP, RETURN)
       ↓
CodeT5-small Seq2Seq Transformer (Encoder-Decoder)
       ↓
Target Code
       ↓
Validation Service (Python ast / JDK javac / Subprocess Sandbox)
       ↓
[If Failed] One-Shot Correction Attempt
       ↓
Validated JSON Response → React UI
```

### Why React and Vite for the Frontend?
- Vite provides instant Hot Module Replacement (HMR) and sub-second builds.
- Monaco Editor provides the industry-standard VS Code editing experience with syntax highlighting and line numbers.

### Why FastAPI for the Backend?
FastAPI is lightweight, asynchronous, natively validates request/response payloads with Pydantic, and creates automatic OpenAPI documentation at `/docs`.

### Why is No Database Required?
CodeBridge is a stateless educational translator and research testbed. Requests are processed on-the-fly, avoiding unnecessary database bloat, user schemas, or migrations.

### How is Security and Safety Handled During Code Execution?
- Isolated temporary directories (`tempfile.mkdtemp`).
- Subprocess execution without `shell=True` to prevent shell injection.
- Strict 5-second execution timeouts to prevent infinite loops (`while True:`).
- Automatic cleanup of files and compiled artifacts after test execution.
