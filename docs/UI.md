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
