---
name: TransCode Lab Design System
colors:
  surface: '#0c1322'
  surface-dim: '#0c1322'
  surface-bright: '#323949'
  surface-container-lowest: '#070e1d'
  surface-container-low: '#141b2b'
  surface-container: '#191f2f'
  surface-container-high: '#232a3a'
  surface-container-highest: '#2e3545'
  on-surface: '#dce2f7'
  on-surface-variant: '#c2c6d6'
  inverse-surface: '#dce2f7'
  inverse-on-surface: '#293040'
  outline: '#8c909f'
  outline-variant: '#424754'
  surface-tint: '#adc6ff'
  primary: '#adc6ff'
  on-primary: '#002e6a'
  primary-container: '#4d8eff'
  on-primary-container: '#00285d'
  inverse-primary: '#005ac2'
  secondary: '#a4c9ff'
  on-secondary: '#00315d'
  secondary-container: '#0267b8'
  on-secondary-container: '#d6e5ff'
  tertiary: '#4edea3'
  on-tertiary: '#003824'
  tertiary-container: '#00a572'
  on-tertiary-container: '#00311f'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#d8e2ff'
  primary-fixed-dim: '#adc6ff'
  on-primary-fixed: '#001a42'
  on-primary-fixed-variant: '#004395'
  secondary-fixed: '#d4e3ff'
  secondary-fixed-dim: '#a4c9ff'
  on-secondary-fixed: '#001c39'
  on-secondary-fixed-variant: '#004883'
  tertiary-fixed: '#6ffbbe'
  tertiary-fixed-dim: '#4edea3'
  on-tertiary-fixed: '#002113'
  on-tertiary-fixed-variant: '#005236'
  background: '#0c1322'
  on-background: '#dce2f7'
  surface-variant: '#2e3545'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 1.5rem
    fontWeight: '600'
    lineHeight: 2rem
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 1.25rem
    fontWeight: '600'
    lineHeight: 1.75rem
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Inter
    fontSize: 1rem
    fontWeight: '600'
    lineHeight: 1.5rem
    letterSpacing: -0.01em
  body-default:
    fontFamily: Inter
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.375rem
  body-compact:
    fontFamily: Inter
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.25rem
  code-lg:
    fontFamily: JetBrains Mono
    fontSize: 0.875rem
    fontWeight: '400'
    lineHeight: 1.5rem
  code-default:
    fontFamily: JetBrains Mono
    fontSize: 0.8125rem
    fontWeight: '400'
    lineHeight: 1.375rem
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '400'
    lineHeight: 1.125rem
  label-default:
    fontFamily: JetBrains Mono
    fontSize: 0.75rem
    fontWeight: '500'
    lineHeight: 1rem
    letterSpacing: 0.02em
  label-compact:
    fontFamily: JetBrains Mono
    fontSize: 0.6875rem
    fontWeight: '500'
    lineHeight: 0.875rem
    letterSpacing: 0.04em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.5rem
  gutter-loose: 0.75rem
  margin: 0.75rem
  margin-panel: 0.5rem
  space-xs: 0.125rem
  space-sm: 0.25rem
  space-md: 0.5rem
  space-lg: 0.75rem
  space-xl: 1rem
  space-2xl: 1.5rem
---

## Brand & Style

This design system targets machine learning researchers, compiler engineers, and software architects evaluating neural code translation models. The emotional register is uncompromisingly rigorous, forensic, and analytical—reminiscent of low-overhead systems tooling and advanced IDE runtimes.

The aesthetic philosophy synthesizes **Technical Minimalism** with **Subtle Tonal Layering**:
- Zero superfluous decorative flourishes, gradients, or soft consumer-style blurs.
- Visual authority established through exact information density, hairline structural delineation, and precise monospaced token alignments.
- High visual scannability: interactive states and semantic outputs pop sharply against deep, anti-reflective charcoal and slate substrates.
- Direct spatial metaphors borrowed from terminal multiplexers, AST visualizers, and multi-pane code diff environments.

## Colors

The palette enforces strict behavioral contracts across data states and model evaluation outputs:

### Base Substrates
- `canvas-default`: `#0B0F17` (Deep void canvas for base application shell)
- `surface-base`: `#111827` (Primary tool windows, editor panels, file trees)
- `surface-elevated`: `#1A2234` (Inspector panels, toolbar decks, floating status popovers)
- `surface-highlight`: `#243048` (Active row selection, hover fills, terminal block quotes)
- `border-subtle`: `#253047` (Structural dividers, panel boundaries, code grid gutters)
- `border-strong`: `#374665` (Active focus rings, docked tab separators, header rules)

### Core Accents
- `accent-primary`: `#3B82F6` (Electric Blue: key interactive primitives, primary action buttons, active tab indicators)
- `accent-subtle`: `#60A5FA` (Light Electric Blue: hover links, code symbols, active token cross-references)
- `accent-muted`: `rgba(59, 130, 246, 0.14)` (Token range selections, AST range highlight blocks)

### Semantic Evaluation Matrix
- **Passed / Equivalent**: `#10B981` (Emerald / Green) for unit test validation, bytecode isomorphism, exact behavioral matches. Background wash: `rgba(16, 185, 129, 0.12)`.
- **Partial / Warning / Inconclusive**: `#F59E0B` (Amber) for partial test passing, warning flags, execution timeout thresholds. Background wash: `rgba(245, 158, 11, 0.12)`.
- **Failed / Divergence**: `#EF4444` (Crimson / Red) for syntax errors, runtime crashes, memory violations, AST divergence. Background wash: `rgba(239, 68, 68, 0.14)`.
- **Neutral / Pending / Skipped**: `#64748B` (Slate) for untracked targets, skipped branches, queued inferences. Background wash: `rgba(100, 116, 139, 0.10)`.

### Text & Glyph Hierarchy
- `text-primary`: `#F8FAFC` (Highest contrast, default code content, values)
- `text-secondary`: `#94A3B8` (Metadata, parameters, inactive headers, line annotations)
- `text-tertiary`: `#64748B` (Line numbers, disabled states, comments, subtle units)

## Typography

The typography bifurcates duties clearly between user-interface guidance (`Inter`) and technical syntax/data verification (`JetBrains Mono`).

- **Inter**: Reserved strictly for view headers, control button text, high-level tabs, breadcrumb navigation, and analytical summaries. Set with tight tracking to maximize screen real estate in complex dashboard layouts.
- **JetBrains Mono**: Used for all source code presentations, AST representations, model generation diffs, execution logs, runtime metrics, matrix tables, and technical metadata tags. Utilizes typographic ligatures for code clarity where standard, with tabular lining numbers enforced throughout to keep metrics aligned row-by-row.
- Line heights in code views are mathematically aligned to `22px` (`1.375rem`) to synchronize multi-pane split diffs across source and target languages.

## Layout & Spacing

TransCode Lab employs an **IDE-style Docked Grid** architecture prioritizing density, spatial persistence, and side-by-side comparative inspection over expansive white space.

### Structural Framework
- **Workbench Canvas**: Fixed 100vw/100vh viewport partitioned into dockable, resizable panels via hairline dividers.
- **Tiling Pane Model**: Supports side-by-side or stacked comparative evaluation (Source Language vs. Encoder Latent State vs. Decoder Output vs. Reference Target).
- **Desktop Primacy (≥ 1280px)**: Multi-column split views with minimum pane widths of `380px`. Left rail reserved for model checkpoint/file navigation (`240px`–`320px`), right rail for telemetry and inspection matrices (`300px`–`400px`).
- **Laptop / Dense Displays (1024px – 1279px)**: Tool rails collapse into icon-only docks (`48px` wide); comparative code view switches to stacked or unified tabbed layout.
- **Tablet / Mobile Fallback (< 1024px)**: Single-active panel layout with a sticky bottom tab bar switching between Code, Diff, Evaluation Metrics, and Console Output.

### Spacing Principles
- Compact baseline grid built on a `4px` sub-rhythm (`space-xs: 2px`, `space-sm: 4px`, `space-md: 8px`).
- Component interior padding defaults to `space-md` horizontally and `space-sm` vertically for buttons, inputs, and tab items to optimize information density.

## Elevation & Depth

This system avoids ambient drop shadows, soft diffusions, and physical depth skeuomorphism. Depth is communicated strictly via **Tonal Stacking** and **Hairline Boundary Outlines**:

- **Level 0 (Canvas Base - `#0B0F17`)**: Global application frame, gutter margins, inactive terminal gutters.
- **Level 1 (Docked Containers - `#111827`)**: Code viewer panes, file tree explorer, telemetry charts. Border: `1px solid #253047`.
- **Level 2 (Active / Focused Context - `#1A2234`)**: Active editor panel, active inspector pane, hover highlights, pinned rows. Border: `1px solid #374665`.
- **Level 3 (Overlays & Menus - `#1A2234`)**: Context menus, command palettes, model selector dropdowns, tooltip inspectors. Border: `1px solid #3B82F6` or `1px solid #374665`, combined with a sharp perimeter shadow: `0 4px 16px rgba(0, 0, 0, 0.60)`.
- **Active Focus & Selection Indication**: Panels and elements in focus receive a `1px` inner or outer border of `#3B82F6`.

## Shapes

The geometric form factor is calibrated for professional desktop density:

- Default controls, inputs, status badges, and tabs feature a micro-radius of `0.25rem` (4px).
- Panel docks, split panes, and fullscreen canvas frames use square outer boundaries (`0px`) where they meet viewport edges or adjacent dividers, transitioning to `0.25rem` only for discrete floating modals or popovers.
- Semantic indicators, inline status dots, and execution state pills leverage a fully rounded pill form (`9999px`) only when constrained to badge components under `20px` in total height.

## Components

### Buttons & Action Triggers
- **Primary**: Background `#3B82F6`, foreground `#FFFFFF`, border `1px solid #3B82F6`. Hover: `#2563EB`. Active: `#1D4ED8`. Font: `Inter` 12px/600.
- **Secondary / Ghost**: Background `#1A2234`, foreground `#F8FAFC`, border `1px solid #253047`. Hover: `#243048`, border `#374665`.
- **Danger / Abort Run**: Background `rgba(239, 68, 68, 0.1)`, foreground `#EF4444`, border `1px solid rgba(239, 68, 68, 0.3)`. Hover: Background `rgba(239, 68, 68, 0.2)`.
- Height: `28px` for inline/dock actions; `32px` for primary header bars.

### Status Chips & Badges
- Constructed with `JetBrains Mono` at `label-compact` (11px).
- **Success / Passed**: Background `rgba(16, 185, 129, 0.12)`, text `#10B981`, border `1px solid rgba(16, 185, 129, 0.3)`.
- **Warning / Partial**: Background `rgba(245, 158, 11, 0.12)`, text `#F59E0B`, border `1px solid rgba(245, 158, 11, 0.3)`.
- **Failure / Crash**: Background `rgba(239, 68, 68, 0.14)`, text `#EF4444`, border `1px solid rgba(239, 68, 68, 0.3)`.
- **Untested / Idle**: Background `rgba(100, 116, 139, 0.12)`, text `#94A3B8`, border `1px solid #253047`.

### Multi-Pane Diff & Code Viewers
- Background `#111827`, gutter background `#0B0F17`. Gutter text `#64748B`.
- Split line indicator: `1px solid #253047`.
- **Added Code (Target / Output)**: Line background `rgba(16, 185, 129, 0.08)`, word diff highlight `rgba(16, 185, 129, 0.20)`.
- **Removed Code (Reference / Ground Truth)**: Line background `rgba(239, 68, 68, 0.08)`, word diff highlight `rgba(239, 68, 68, 0.22)`.
- **Token Attention Heatmap**: Background overlay in varying opacities of `#3B82F6` (e.g., `rgba(59, 130, 246, 0.1)` to `rgba(59, 130, 246, 0.45)`).

### Lists, Trees & Data Tables
- Row height: `26px` (compact tree nodes) to `32px` (evaluation test case rows).
- Border bottom: `1px solid #1A2234`.
- Hover row state: Background `#1A2234`.
- Selected row state: Background `#243048` with a `2px` left border marker in `#3B82F6`.
- Metric numbers right-aligned, monospaced tabular numerals.

### Input Fields & Selectors
- Background `#0B0F17`, border `1px solid #253047`, text `#F8FAFC`.
- Focus state: Border `1px solid #3B82F6`, outline `none`.
- Monospaced parameters input: Uses `JetBrains Mono` 12px for model hyperparameters (e.g., temperature, top_p, beam_width).

### Panes & Cards
- Panels use `surface-base` (`#111827`) with a persistent `border-subtle` (`#253047`).
- Header bars within cards/panes: Height `32px`, padding `0 8px`, background `#0B0F17`, border bottom `1px solid #253047`, displaying monospace tab titles and status counts.