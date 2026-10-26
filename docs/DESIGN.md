# HutFix Design System Specification (Phase 9 — Teal/Slate Trust Direction)

> **Authority:** Guided by the [Impeccable Design Standard](https://github.com/pbakaus/impeccable). Crafted specifically for on-demand home service automation in Dhaka with strict WCAG contrast compliance.

---

## 1. Product Truth & Brand Personality

- **Platform:** Web application (mobile-responsive from 320px viewport to widescreen desktop).
- **Core User:** Dhaka apartment dwellers, homeowners, and busy professionals needing dependable, verified home technicians without booking conflicts or hidden fees.
- **Brand Voice:** Competent, direct, warm, and honest. Never cute, never developer jargon.
- **Visual Tone:** **Teal / Slate Trust Direction** — editorial typography paired with serene, high-contrast cool surfaces and rich teal action affordances.
- **Anti-Patterns Eliminated:** Zero gradient text, zero glowing shadow halos, zero nested cards, zero bounce hover effects (`translateY`), zero side-tab colored accents, zero uncalibrated low-contrast text.

---

## 2. Color Palette & Dual-Theme Tokens

The palette is anchored in **Deep Teal & Slate Blue** for maximum readability, high contrast, and serene dependability.

### 2.1 Theme Palette Matrix

| Semantic Role | Token Name | Light Theme Value | Dark Theme Value | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Page Background** | `--bg` | `#f7f9f9` (Cool Off-White) | `#031716` (Deepest Teal) | Foundational canvas surface |
| **Card Surface** | `--surface` | `#ffffff` (Pure White) | `#032F30` (Deep Forest Teal) | Elevated cards, forms, modals |
| **Muted Surface** | `--surface-muted` | `#eef4f5` (Soft Teal Tint) | `#0A7075` (Deep Sea Teal) | Secondary panels, inputs, sidebars |
| **Primary Text** | `--text` | `#031716` (Deepest Teal) | `#f1f5f9` (Near-White Tint) | High-contrast body copy and headings |
| **Muted Text** | `--text-muted` | `#274D60` (Slate Blue) | `#6BA3BE` (Muted Slate Blue) | Secondary labels, captions, metadata |
| **Subtle Text** | `--text-subtle` | `#5590ad` (Muted Blue) | `#4a7a8c` (Deep Muted Slate) | Tertiary hints and dividers |
| **Border Line** | `--border` | `#c5d5d8` (Firm Line) | `#205558` (Defined Dark Border) | Card boundaries, dividers |
| **Strong Border** | `--border-strong` | `#9fb8bf` (Structured Slate) | `#2a5c5e` (Crisp Border) | Inputs, active card edges |
| **Primary Action** | `--accent` / `--brand-600` | `#0A7075` (Deep Teal) | `#0C969C` (Bright Vivid Teal) | Action buttons, active tabs |
| **Hover State** | `--accent-hover` | `#0C969C` (Bright Teal) | `#6BA3BE` (Light Slate Hover) | Button hover states |
| **Action Text** | `--accent-text` / `--brand-text` | `#ffffff` (White on Dark Teal) | `#031716` (Dark on Bright Teal) | Button label contrast |
| **Focus Ring** | `--focus-ring` | `#0A7075` | `#0C969C` | 2px accessible outline |

---

## 3. Contrast Ratios & WCAG Compliance

Every single color combination is mathematically verified via relative luminance calculations against WCAG 2.1 standards ($\ge 7:1$ AAA for body text, $\ge 4.5:1$ AA for secondary copy and controls, and $\ge 1.5:1$ for structural borders).

| Semantic Pair | Token Pair | Light Measured | Dark Measured | Standard Target | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Body Text on Background** | `--text` vs `--bg` | **17.46 : 1** | **16.84 : 1** | $\ge 7.0 : 1$ (AAA) | **PASS** |
| **Body Text on Surface** | `--text` vs `--surface` | **18.45 : 1** | **13.19 : 1** | $\ge 7.0 : 1$ (AAA) | **PASS** |
| **Muted Text on Background** | `--text-muted` vs `--bg` | **8.58 : 1** | **6.68 : 1** | $\ge 4.5 : 1$ (AA) | **PASS** |
| **Muted Text on Surface** | `--text-muted` vs `--surface` | **9.06 : 1** | **5.24 : 1** | $\ge 4.5 : 1$ (AA) | **PASS** |
| **Subtle Text on Background** | `--text-subtle` vs `--bg` | **3.32 : 1** | **3.91 : 1** | $\ge 3.0 : 1$ | **PASS** |
| **Button Label on Action** | `--accent-text` vs `--accent` | **5.85 : 1** | **5.15 : 1** | $\ge 4.5 : 1$ (AA) | **PASS** |
| **Card Border on Surface** | `--border` vs `--surface` | **1.51 : 1** | **1.72 : 1** | $\ge 1.5 : 1$ | **PASS** |
| **Badge: Requested** | status text vs badge surface | **8.15 : 1** | **10.83 : 1** | $\ge 4.5 : 1$ (AA) | **PASS** |
| **Badge: Accepted** | status text vs badge surface | **7.40 : 1** | **4.89 : 1** | $\ge 4.5 : 1$ (AA) | **PASS** |
| **Badge: On The Way** | status text vs badge surface | **11.87 : 1** | **9.85 : 1** | $\ge 4.5 : 1$ (AA) | **PASS** |
| **Badge: In Progress** | status text vs badge surface | **6.92 : 1** | **9.28 : 1** | $\ge 4.5 : 1$ (AA) | **PASS** |
| **Badge: Completed** | status text vs badge surface | **12.49 : 1** | **7.26 : 1** | $\ge 4.5 : 1$ (AA) | **PASS** |
| **Badge: Cancelled** | status text vs badge surface | **6.80 : 1** | **8.51 : 1** | $\ge 4.5 : 1$ (AA) | **PASS** |

---

## 4. Typography System (Instrument Serif + Geist)

Phase 9 resets typography to an editorial, human pair:
- **Display Headings (`h1, h2, h3, .hero__title, .section-title`):** **Instrument Serif** (Google Fonts). Unpretentious, humanist editorial serif with authentic warmth.
- **Body & Controls (`body, button, input, textarea, select, .btn`):** **Geist** (Google Fonts). Highly legible, neutral sans-serif optimized for clean scanning and numeric clarity.

| Role | Tag / Class | Font Family | Size | Weight | Line Height |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Title** | `.hero__title, h1` | `'Instrument Serif', Georgia, serif` | `44px` (`2.75rem`) | 400 | `1.05` |
| **Section Title** | `.section-title, h2` | `'Instrument Serif', Georgia, serif` | `26px` (`1.625rem`) | 400 | `1.15` |
| **Subsection Header**| `h3` | `'Instrument Serif', Georgia, serif` | `21px` (`1.3125rem`) | 400 | `1.2` |
| **Card Heading** | `h4, .h4` | `'Geist', sans-serif` | `18px` (`1.125rem`) | 600 | `1.4` |
| **Body Primary** | `body, p` | `'Geist', sans-serif` | `16px` (`1.0rem`) | 400 | `1.5` |
| **Controls & Inputs**| `input, select, .btn` | `'Geist', sans-serif` | `14px` (`0.875rem`) | 500 / 600 | `1.35` |
| **Captions / Chips** | `small, .chip, .badge` | `'Geist', sans-serif` | `12px` (`0.75rem`) | 600 | `1.2` |

---

## 5. Dark Mode Contrast Hardening

1. **Brand Context Panel (`.auth-shell__brand`):**
   - In light theme, uses soft teal tint `--surface-muted` (`#eef4f5`).
   - In dark theme, uses deep forest `--surface-muted` (`#0A7075`), with foreground text elevated to `--text` (`#f1f5f9`), guaranteeing `5.34:1` contrast.
2. **Form Labels:** Every label is full-strength `var(--text)` with `font-weight: 500` and `font-size: 14px`, never muted.
3. **Inputs & Placeholders:** Inputs styled with `var(--border-strong)` and explicit opacity 1 placeholder (`var(--text-muted)`).
4. **Links:** Underlines provide visual affordance with smooth hover thickness transition.

---

## 6. Verification Status

- Detector Antipattern Findings: **0**
- Hardcoded Color Declarations: **0**
- Test Suite Status: **109 PASS / 0 FAIL** across all 10 phases.
