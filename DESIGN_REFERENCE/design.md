# design.md
# CodeBridge — UI/UX and System Design

## 1. Design Direction

Create a **clean developer-tool interface**, not a generic AI chatbot.

The product should feel like a lightweight code editor.

Visual goals:
- dark developer theme,
- clear typography,
- strong code readability,
- minimal animations,
- compact controls,
- clear validation status.

Do not add unnecessary dashboards, charts, user profiles, or chat bubbles.

---

# 2. Main Screen

The main screen is a single translation workspace.

```text
┌───────────────────────────────────────────────────────────────┐
│  < > CodeBridge                         Transformer ● Ready  │
│  Automated Code Translation                                │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  Python ▼                     →                     Java ▼    │
│                                                               │
├─────────────────────────────┬─────────────────────────────────┤
│ SOURCE                      │ TRANSLATION                    │
│                             │                                │
│  1  def add(a, b):          │  1  public static int add(...) │
│  2      return a + b        │  2      return a + b;          │
│                             │                                │
│                             │                                │
│                             │                                │
│                             │                                │
├─────────────────────────────┴─────────────────────────────────┤
│  Structure ✓   Validation ✓                     [Translate]  │
├───────────────────────────────────────────────────────────────┤
│ VALIDATION                                                     │
│                                                               │
│ Syntax        PASS                                            │
│ Compilation   PASS                                            │
│ Tests         3 / 3 PASS                                      │
│                                                               │
│ No validation errors found.                                  │
└───────────────────────────────────────────────────────────────┘
```

---

# 3. Header

Header contains:

Left:
- CodeBridge logo/name
- short subtitle: "Automated Code Translation"

Right:
- model status
- small status indicator:
  - Ready
  - Loading
  - Error

No login/profile system.

---

# 4. Language Controls

Place source and target selectors above the editors.

Example:

```text
[ Python ▼ ]       [ ⇄ ]       [ Java ▼ ]
```

The swap button exchanges the two languages.

Supported in MVP:
- Python
- Java

The UI should make unsupported language selection impossible.

---

# 5. Editor Layout

Use two equal-width panels.

## Left

### Label

`SOURCE CODE`

Controls:
- Copy
- Clear
- Load Example

Editor:
- line numbers
- syntax highlighting
- monospaced font
- horizontal scrolling
- visible selection

## Right

### Label

`TRANSLATED CODE`

Controls:
- Copy
- Download `.py` / `.java`

The target editor is read-only during normal translation.

---

# 6. Translation Controls

Main button:

```text
[ Translate Code ]
```

When clicked:

```text
[ Translating... ]
```

Disable duplicate clicks during generation.

Optional advanced toggle:

```text
☑ Use structural information
☑ Validate output
```

Default:
- structural information: ON
- validation: ON

This lets the student demonstrate the research contribution directly.

---

# 7. Research Mode

Add a small collapsible panel called:

**Experiment Mode**

Options:

```text
○ Baseline
● Structural
○ Structural + Validation
```

This is useful for demonstrating the research idea during the viva.

### Baseline

Uses only source code.

### Structural

Uses source code + extracted structure.

### Structural + Validation

Uses source code + structure, then validates generated code.

Do not make this screen complicated.

---

# 8. Structure Panel

Add a collapsible panel underneath the source editor:

```text
STRUCTURE ANALYSIS

FUNCTION
PARAMETER
IF
RETURN
```

This lets the user see that the system is extracting code structure.

Do not show the entire Tree-sitter syntax tree.

---

# 9. Validation Panel

Use simple status rows.

```text
VALIDATION

Syntax          ✓ PASS
Compilation     ✓ PASS
Tests           ✓ 3/3 PASS
```

Failure:

```text
VALIDATION

Syntax          ✓ PASS
Compilation     ✕ FAIL
Tests           — SKIPPED

Error
Line 12: cannot find symbol ...
```

Use icons and text together so the status does not depend only on color.

---

# 10. Correction Status

When correction happens:

```text
CORRECTION

Initial validation: FAILED
Correction attempt: 1/1
Final validation: PASSED
```

If correction fails:

```text
CORRECTION

Initial validation: FAILED
Correction attempt: 1/1
Final validation: FAILED

Please inspect the generated code and compiler error.
```

Never tell the user that code is "guaranteed correct".

---

# 11. Empty State

Before translation:

```text
Your translated code will appear here.

Paste a short Python/Java function and click Translate.
```

Keep it simple.

---

# 12. Error State

Backend/network error:

```text
Unable to contact the translation service.

Check that the FastAPI backend is running.
```

Model error:

```text
The translation model could not be loaded.
Check the model path and Python environment.
```

Compiler error:

```text
Translation generated successfully, but the target code failed compilation.
```

This distinction is important:

**Generation success is not the same as translation correctness.**

---

# 13. Responsive Design

Desktop is the primary target.

For smaller screens:

```text
Source
↓
Target
↓
Validation
```

The editor panels stack vertically.

Do not create a separate mobile architecture.

---

# 14. Color and Typography Direction

Use a dark IDE-style interface.

Suggested visual hierarchy:

- near-black background,
- slightly lighter editor panels,
- white/gray primary text,
- muted secondary text,
- one accent color for primary actions,
- clear green/red status indicators,
- monospace editor font.

Do not use gradients heavily.

Do not make the interface look like a chatbot.

---

# 15. System Architecture Diagram

```text
                        ┌───────────────────────┐
                        │      React UI         │
                        │  Code Editor + Result │
                        └───────────┬───────────┘
                                    │
                                  REST
                                    │
                        ┌───────────▼───────────┐
                        │      FastAPI           │
                        │       Backend          │
                        └───────────┬───────────┘
                                    │
                  ┌─────────────────┼──────────────────┐
                  │                 │                  │
                  ▼                 ▼                  ▼
          ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
          │ Structure    │  │ Transformer  │  │ Validator    │
          │ Extractor    │  │ Translator   │  │              │
          │ Tree-sitter  │  │ CodeT5       │  │ Python/JDK   │
          └──────┬───────┘  └──────┬───────┘  └──────┬───────┘
                 │                 │                  │
                 └─────────────────┼──────────────────┘
                                   ▼
                         ┌────────────────────┐
                         │ Correction Service │
                         │ max 1 retry        │
                         └────────────────────┘
```

---

# 16. Data Flow

```text
User Code
   ↓
Source Validation
   ↓
Tree-sitter
   ↓
Structure Summary
   ↓
Model Input Builder
   ↓
CodeT5 Encoder
   ↓
CodeT5 Decoder
   ↓
Target Code
   ↓
Syntax / Compilation
   ↓
Optional Tests
   ↓
Optional One-Time Correction
   ↓
Final Result
```

---

# 17. Component Responsibilities

## Frontend

Responsible for:
- input,
- selection,
- display,
- API requests,
- status presentation.

It should not contain ML logic.

## FastAPI

Responsible for:
- request handling,
- orchestration,
- validation calls,
- returning JSON.

## Structure Service

Responsible only for:
- parsing,
- extracting selected structural nodes,
- producing structure summary.

## Translation Service

Responsible only for:
- tokenizer,
- model,
- generation,
- decoding.

## Validation Service

Responsible only for:
- syntax checks,
- compilation,
- controlled execution,
- test result.

## Correction Service

Responsible for:
- receiving validation error,
- making one revised generation request.

---

# 18. Design Rules for Antigravity

1. Keep components small.
2. Avoid unnecessary abstraction layers.
3. Prefer simple functions over framework-heavy patterns.
4. Keep ML code in Python.
5. Keep frontend code in React.
6. Keep API contracts explicit.
7. Add comments for ML logic.
8. Do not hide important logic behind generated magic code.
9. Do not implement features outside the PRD.
10. Every major screen must be understandable from the screenshots and code alone.

---

# 19. Final Product Feel

The finished product should feel like:

**"A small AI-powered code translation IDE"**

not:

**"A large enterprise software platform."**

The user should be able to understand the entire workflow by looking at the screen:

```text
SOURCE
  ↓
TRANSLATE
  ↓
TARGET
  ↓
VALIDATE
```

That simplicity is intentional and should be preserved.
