# HutFix — Frontend & UI Component System

## 1. Page Specifications

### `index.html` (Landing & Discovery Portal)
- **Purpose**: Brand introduction, value proposition, live platform health status, and interactive 8-category exploration grid.
- **Primary Sections**:
  - Top navigation bar with login/dashboard shortcut and brand identity.
  - Hero banner with headline, service search input, and dynamic quick CTA cards.
  - Category showcase grid featuring high-definition photography loaded via `window.IMAGES.category(slug)` and base starting prices.
  - Trust indicators, safety guarantee, and responsive footer.
- **Components Used**: Service category cards, search filters, health pill badge.

### `login.html` (Unified Role Authentication)
- **Purpose**: Role-aware login and registration portal with one-click demo role fillers.
- **Primary Sections**:
  - Centered auth card with tabbed switch between "Sign In" and "Create Account".
  - One-click demo credentials bar (Customer, Provider, Admin).
  - Post-login role redirect router (`#goto-dashboard`).
- **Components Used**: Form controls, credential pills, feedback alerts.

### `request.html` (Smart Matching & Slot Booking)
- **Purpose**: Multi-step booking workflow from location/category intake to smart ranking and slot reservation.
- **Primary Sections**:
  - Service intake form (category select, date picker, time window, address, urgency toggle, optional image upload).
  - Ranked recommendations list with real-time match scores and breakdown badges.
  - Slot selector grid generated via `/api/providers/:id/slots`.
  - Booking confirmation panel with transparent cost breakdown.
- **Components Used**: Form steppers, candidate ranking cards, slot chips, image uploader.

### `tracking.html` (Customer Service Tracking Portal)
- **Purpose**: Real-time status tracking for customer service requests with live progression stepper, timeline, notifications bell, and integrated rating & invoice actions.
- **Primary Sections**:
  - Top navigation with real-time notifications bell dropdown (`#notif-bell`, `#notif-count`, `#notif-panel`).
  - Left sidebar listing customer's active and historical service requests with thumbnail badges.
  - Right detail panel featuring 5-stage progression stepper, technician profile card (`window.IMAGES.providerAvatar`), location details, and status history timeline (`#timeline`).
  - Action footer featuring cancellation, "View invoice" link, and interactive 5-star rating modal.
- **Components Used**: 5-stage stepper, status badges, timeline nodes, notifications dropdown, star rating picker modal.

### `provider.html` (Provider Operations & Task Dashboard)
- **Purpose**: Specialist management portal for reviewing incoming jobs, claiming assignments, and updating fulfillment stages.
- **Primary Sections**:
  - Top dark navigation bar with real-time notifications bell (`#notif-bell`, `#notif-count`).
  - 3-bucket tabbed view: Incoming, Active Tasks, History.
  - Incoming card deck sorted client-side by urgency (urgent first with red pulsing badge) and scheduled date.
  - Task cards with customer phone, address, scheduled time, and status progression action buttons.
- **Components Used**: Tab pills with counter badges, pulsing urgent pills (`.pulse-urgent`), task cards, action buttons.

### `invoice.html` (Print-Ready Service Invoice)
- **Purpose**: Clean, A4-styled printable invoice view for completed service requests.
- **Primary Sections**:
  - Top action bar with "Back to tracking" and "Download / Print" (`window.print()`).
  - Invoice header with HutFix logo, INV number, and issue timestamp.
  - Two-column Bill To / Service Provider details.
  - Itemized table with description, subtotal, 5% platform tax, and total in BDT.
- **Components Used**: Printable sheet container, tabular ledger, print stylesheet overrides (`@media print`).

---

## 2. Design Tokens (`client/css/tokens.css`)

Every CSS token variable declared in `:root`:
- `--brand-500`: `#2dd4bf` (Bright Craft Teal)
- `--brand-600`: `#0e6258` (Craft Pine primary)
- `--brand-700`: `#073832` (Deep Forest Pine)
- `--bg`: `#fbfbfa` (Application canvas background)
- `--surface`: `#ffffff` (Card and panel surface)
- `--text`: `#111817` (Primary typography obsidian)
- `--muted`: `#586361` (Secondary / muted text)
- `--border`: `#e2e8e5` (Neutral container border)
- `--success`: `#16a34a` (Success emerald green)
- `--warning`: `#b45309` (Warning amber / terracotta)
- `--danger`: `#dc2626` (Danger / urgent crimson)
- `--radius`: `10px` (Default component border radius)
- `--shadow-sm`: `0 1px 2px rgba(0,0,0,0.05)` (Subtle surface shadow)
- `--shadow-md`: `0 4px 12px rgba(0,0,0,0.07)` (Elevated modal and panel shadow)
- `--font`: `'Manrope', system-ui, -apple-system, sans-serif` (Primary font stack)

---

## 3. Status Badge Color Palette

| Status Key | Class Name | Background Color | Text Color | Visual Meaning |
| :--- | :--- | :--- | :--- | :--- |
| `requested` | `.status-requested` | `#fef3c7` | `#92400e` | Awaiting provider review |
| `accepted` | `.status-accepted` | `#dbeafe` | `#1e40af` | Provider confirmed assignment |
| `on_the_way` | `.status-on_the_way` | `#e0e7ff` | `#3730a3` | Specialist en route |
| `in_progress` | `.status-in_progress` | `#fce7f3` | `#9d174d` | Service execution underway |
| `completed` | `.status-completed` | `#d1fae5` | `#065f46` | Job successfully fulfilled |
| `cancelled` | `.status-cancelled` | `#fee2e2` | `#991b1b` | Request terminated & slot freed |

---

## 4. Design System (Phase 8 — Impeccable Direction)

Phase 8 overhauled the visual language following the **Impeccable Design Standard**, eliminating all AI-generated antipatterns (gradients, glassmorphism, bouncing hover animations, glowing halo shadows, and overused font choices) and replacing them with a disciplined, craft-oriented palette and typography. For full details, see [docs/DESIGN.md](docs/DESIGN.md).

### Design Tokens (`client/css/tokens.css`)

- **Color Scales**:
  - `--brand-50` through `--brand-700`: Craft Pine primary palette (`--brand-600: #0e6258` light / `#14b8a6` dark, `--brand-text: #ffffff` light / `#042f2e` dark).
  - `--accent-50` through `--accent-600`: Warm Terracotta / Amber palette (`--accent-500: #b45309` light / `#f59e0b` dark).
  - High-contrast surfaces: `--bg` (`#fbfbfa` / `#0c0e12`), `--surface` (`#ffffff` / `#141820`), `--surface-muted` (`#f3f4f3` / `#1c222c`).
  - Container borders: `--border` (`#e2e8e5` / `#262e3b`), `--border-strong` (`#c4cec9` / `#3b4759`).
- **Radii & Shadows**:
  - `--radius-sm` (6px), `--radius` (10px), `--radius-lg` (16px), `--radius-pill` (9999px).
  - Crisp, subtle elevations without glowing halos: `--shadow-sm`, `--shadow-md`.
- **Typography & Motion**:
  - Font family: `'Manrope', system-ui, -apple-system, sans-serif` across display headings, UI controls, and body text (0 detector findings).
  - Predictable durations: `--transition-fast` (120ms ease), `--transition-base` (200ms ease). Zero bouncing `translateY` hover lifts.

### Component Library (`client/css/components.css`)

- `.app-nav`: Crisp, solid navigation bar with high-contrast text and clean borders (no blurred glassmorphism).
- `.btn-brand`: Direct pine-colored button with WCAG AA/AAA contrast and clear 2px focus ring.
- `.hero`: Editorial typography hierarchy, contextual quick jump, and trust metrics.
- `.category-card`: Sturdy service card with crisp image thumbnail, category metadata, and price tag.
- `.auth-shell`: Two-column auth container with brand value proposition and direct login/register tab switcher.
- `.theme-toggle`: Accessible circular toggle button with `aria-label` and dynamic `<meta name="theme-color">` synchronizer.
- `.skeleton`: High-contrast content loading placeholder.
- `.chip`: Compact pill badge for tags, ratings, and filters.
- `.footer`: Subtle surface-muted footer with platform navigation and copyright.

### Dark Mode Architecture & Contrast Hardening

- **Root Attribute**: Governed by `document.documentElement.setAttribute('data-theme', 'light' | 'dark')`.
- **Contrast Parity**: All theme tokens mathematically validated for WCAG AA/AAA compliance:
  - Body text on background: **16.87:1** (light) / **16.78:1** (dark).
  - Muted text on background: **6.40:1** (light) / **7.08:1** (dark).
  - Button text on brand: **7.22:1** (light) / **5.81:1** (dark).
  - Surface borders: **1.57:1** (light) / **1.59:1** (dark).
- **Theme Controller (`client/js/theme.js`)**:
  - Self-contained IIFE executed in `<head>` to prevent FOUT.
  - Updates `<meta name="theme-color">` dynamically.
  - Supports URL parameter override (`?theme=dark` or `?theme=light`).
  - Persists preference in `localStorage` under `hutfix_theme`.

### Responsive Breakpoints (`client/css/pages.css`)

- **Desktop (> 992px)**: 4-column service grid (`categories-grid`), 2-column request booking grid (`request-grid`), side-by-side tracking workbench.
- **Tablet (<= 992px)**: `.request-grid` and `.tracking-grid` collapse to single column with sticky panels transitioning to document flow; categories grid collapses to 2 columns.
- **Mobile (<= 576px)**: Single-column full-width layouts with touch-friendly controls and minimum 16px internal padding to ensure 0 cramped-padding antipatterns.
