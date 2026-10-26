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
- `--brand-500`: `#2563eb` (Primary brand blue)
- `--brand-600`: `#1d4ed8` (Brand hover blue)
- `--brand-700`: `#1e40af` (Brand active / accent blue)
- `--bg`: `#f8fafc` (Application canvas background)
- `--surface`: `#ffffff` (Card and panel surface)
- `--text`: `#0f172a` (Primary typography dark slate)
- `--muted`: `#64748b` (Secondary / muted text)
- `--border`: `#e2e8f0` (Neutral container border)
- `--success`: `#16a34a` (Success emerald green)
- `--warning`: `#d97706` (Warning amber)
- `--danger`: `#dc2626` (Danger / urgent crimson)
- `--radius`: `14px` (Default component border radius)
- `--shadow-sm`: `0 1px 2px rgba(15,23,42,.06)` (Subtle surface shadow)
- `--shadow-md`: `0 8px 24px rgba(15,23,42,.08)` (Elevated modal and hero shadow)
- `--font`: `'Inter', system-ui, -apple-system, sans-serif` (System font stack)

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

## 4. Design System (Phase 7)

Phase 7 introduces a modern visual design token scale, component library, and first-class dark-mode support layered on top of Bootstrap 5.

### Design Tokens (`client/css/tokens.css`)

- **Color Scales**:
  - `--brand-50` through `--brand-700`: Indigo primary scale (`--brand-500: #6366f1`, `--brand-600: #4f46e5`, `--brand-700: #4338ca`).
  - `--violet-500` & `--violet-600`: Rich violet secondary accent (`#8b5cf6`, `#7c3aed`).
  - `--accent-gradient`: `linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)` for hero gradients, buttons, and brand titles.
  - `--accent-gradient-soft`: Soft translucent gradient for ambient backdrops and hover rings.
- **Surfaces & Glass**:
  - `--bg`, `--bg-muted`, `--surface`, `--surface-muted`: High-contrast semantic surface colors.
  - `--glass-bg`: Translucent frosted backdrop (`rgba(255, 255, 255, 0.85)` / `rgba(15, 23, 42, 0.85)`).
  - `--glass-border`: Subtle 1px frosted container outline (`rgba(255, 255, 255, 0.3)` / `rgba(255, 255, 255, 0.08)`).
- **Radii & Shadows**:
  - `--radius-sm` (8px), `--radius` (14px), `--radius-lg` (20px), `--radius-pill` (9999px).
  - `--shadow-sm`, `--shadow-md`, `--shadow-lg`, `--shadow-glow` (indigo diffused glow).
- **Typography & Motion**:
  - `--font-display`: `'Plus Jakarta Sans', system-ui, sans-serif` for titles and display headings.
  - `--font-sans`: `'Inter', system-ui, sans-serif` for readable body text and numeric ledgers.
  - `--transition-fast` (150ms), `--transition-base` (200ms), `--transition-smooth` (300ms cubic-bezier).

### Component Library (`client/css/components.css`)

- `.app-nav`: Sticky glassmorphic navigation bar with blurred backdrop filter.
- `.btn-brand`: Primary gradient-backed interactive button with hover elevation and active state.
- `.hero`: Impactful hero section with typography hierarchy, search intake, and dynamic image collage.
- `.category-card`: Rounded service card with smooth image scaling, category badge, and starting price.
- `.auth-shell`: Two-column auth container with ambient gradient branding and centered card.
- `.theme-toggle`: Glass circular toggle button triggering light/dark mode with icon rotation.
- `.skeleton`: Animated shimmer loading placeholder for asynchronous queries.
- `.chip`: Compact pill badge for tags, status highlights, and slot filters.
- `.stat-block`: Clean metric block displaying numbers and descriptive subtext.
- `.feature-card`: Three-stage process step card with gradient icon backing.
- `.form-control-lg`: Elevated rounded input control with brand glow focus ring.
- `.footer`: Modern full-bleed footer with platform navigation, copyright, and live health status badge.

### Dark Mode Architecture

- **Root Attribute**: Theme state is governed by `document.documentElement.setAttribute('data-theme', 'light' | 'dark')`.
- **Controller (`client/js/theme.js`)**:
  - Encapsulated in `window.HutTheme` IIFE.
  - Evaluates saved theme from `localStorage.getItem('hutfix_theme')`.
  - Falls back to OS system preference `window.matchMedia('(prefers-color-scheme: dark)')`.
  - Automatically updates `.theme-toggle` icons across light (`bi-moon-stars`) and dark (`bi-sun`) states.
  - Self-registers click listeners on any element with `.theme-toggle`.
- **CSS Overrides**: `[data-theme="dark"]` in `tokens.css` swaps background canvas (`#0b0f19`), card surfaces (`#111827`), text slate (`#f8fafc`), and adjusts borders without touching business markup.

### Responsive Breakpoints (`client/css/pages.css`)

- **Desktop (> 992px)**: Multi-column side-by-side grids (3-column intake & match layout on request page, 4-column service cards, 3-column feature steps).
- **Tablet (<= 992px)**: `.request-grid` stacks intake form above sticky recommendations panel; hero collage simplifies to ambient preview; categories grid collapses to 2 columns.
- **Mobile (<= 576px)**: Single-column full-width layouts; form controls optimize for touch targets; trust-strip and stats reorient vertically; sticky match panel sits flush with safe margins.
