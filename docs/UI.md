# Fixora — Frontend UI & Design System Specification

## 1. Overview & Reference Architecture

Fixora is the definitive UI for the HutFix Smart Home Service Automation platform. It adopts the modern, high-density dashboard design from `client/_reference_fixora/` with full real-backend API wiring, responsive mobile layouts, and strict role-based access control (RBAC).

- **Brand & Theme**: Deep Slate / Indigo accents (`#2563eb`), neutral grays (`#0f172a`, `#1e293b`, `#f8fafc`), clean surface borders (`#e2e8f0`).
- **Typography**: Inter / system sans-serif hierarchy scaled strictly to $\ge 11$px to eliminate readability defects.
- **Architectural Paradigm**: Single-page application (SPA) architecture (`client/index.html`) driven by `client/app.js`. Consolidates previous multi-page interfaces (`customer.html`, `provider.html`, `admin.html`, and `invoice.html`) into a unified reactive dashboard. Business state is strictly queried from and mutated against real PostgreSQL REST APIs; zero mock data or dummy state.
- **Role-Based Access Control (RBAC)**: Enforced via server-side session cookies (`hutfix_token`). The sidebar navigation dynamically adapts to the authenticated role (`customer`, `provider`, or `admin`), while API endpoints strictly enforce 401 Unauthorized and 403 Forbidden guards.

---

## 2. Authentication Gate & Session Management

### `#auth-screen` (Modal Gateway)
When an unauthenticated user opens Fixora, an accessible modal overlay covers the dashboard view:
- **Form Controls**: Email input (`#auth-email`), password input (`#auth-password`), toggle between Login and Sign Up.
- **Demo Switcher Links**: Quick-fill demo credentials buttons (`data-demo="customer"`, `data-demo="provider"`, `data-demo="admin"`).
- **Session Verification**: On load, `boot()` queries `GET /api/auth/me`. If valid, the overlay is hidden and role-scoped dashboard views are mounted. If 401, `#auth-screen` is presented.
- **Logout Action**: `#logoutBtn` triggers `POST /api/auth/logout`, clears memory cache, and displays the authentication screen.

---

## 3. Role Views & Workflows

### 3.1 Customer View
- **Browse & Discovery**:
  - Hero banner with quick search and category highlights.
  - 8 category cards dynamically rendered via `client/js/images.js` Unsplash CDN photography: Appliance Repair, Plumbing, Electrical, Cleaning & Pest Control, Home Maintenance, Moving & Shifting, Car Care & Repair, Personal Care.
- **Smart Booking Modal (`#bookingModal`)**:
  - Category selector pre-filled on card click.
  - Location input with Dhaka area presets.
  - Interactive Date Picker & 1-Hour Slot Scheduler (`GET /api/providers/:id/slots`).
  - Real-time provider ranking via multi-factor matching engine (`POST /api/requests/match`).
  - Concurrency-safe submission (`POST /api/requests`) protected by PostgreSQL advisory transaction locks (`pg_advisory_xact_lock`). If a conflict arises, 409 suggestions are presented.
- **Live Tracking & Service History (`#view-tracking`, `#view-history`)**:
  - 5-stage visual progress stepper:
    $$\text{Requested} \longrightarrow \text{Accepted} \longrightarrow \text{On the Way} \longrightarrow \text{In Progress} \longrightarrow \text{Completed}$$
  - Audit event timeline showing exact timestamps of lifecycle changes.
  - Real-time cancellation button for pending requests.
  - Service Invoice view (`GET /api/invoices/by-request/:id`) detailing subtotal, 5% platform tax, and total.
  - Customer Review Modal (`#reviewModal` calling `POST /api/ratings/by-request/:id`) with 1–5 star rating and comment submission.

### 3.2 Provider View
- **Incoming Requests Tab (`#view-incoming`)**:
  - Unclaimed jobs matching provider services.
  - Instant **Accept** (`POST /api/requests/:id/accept`) and **Reject** (`POST /api/requests/:id/reject`).
- **Active Jobs Tab (`#view-active`)**:
  - Current engagements undergoing fulfillment.
  - One-click status advancement button advancing state through the finite state machine (`PATCH /api/requests/:id/status`).
- **Work History & Earnings Tab (`#view-earnings`, `#view-gigs`)**:
  - Completed jobs history with gross earnings totals.
  - Provider service catalog and hourly rate configuration.
  - Provider profile viewer populated via `GET /api/providers/:userId/profile`.

### 3.3 Admin View
- **Overview Dashboard (`#view-admin-overview`)**:
  - Platform metric counter cards: Total Bookings, Completed Jobs, Gross Volume (BDT), Platform Revenue (5% tax), Registered Providers, Total Users.
  - Sourced directly from `GET /api/admin/stats`.
- **User Management Ledger (`#view-admin-users`)**:
  - Responsive table populated from `GET /api/admin/users` listing user names, emails, roles, phone numbers, and registration dates.
- **Master Bookings Ledger (`#view-admin-bookings`)**:
  - System-wide booking ledger populated from `GET /api/admin/bookings` displaying customer, assigned provider, service category, date, slot time, price, and current lifecycle status.

---

## 4. Typography Scaling System

To ensure mathematical WCAG readability across all display resolutions, the legacy sub-11px typography was scaled up across `client/style.css`:

| Original Range | Scaled Target Range | Application Context |
| :--- | :--- | :--- |
| `7px – 8px` | `11px` | Micro status indicators, tiny badges, fine meta captions |
| `9px – 10px` | `12px – 13px` | Timestamps, table footer notes, helper tags |
| `11px` | `14px` | Secondary metadata, labels, small button labels |
| `12px – 14px` | `15px` | Standard body copy, inputs, table cell contents |
| `15px – 16px` | `16px – 17px` | Card headers, prominent labels, navigation items |
| Explicit Display Headers | `32px – 40px` | Page titles (`.page-head h1: 32px`), Hero banner (`.hero h1: 40px`) |

**Zero Tolerance Check**: The stylesheet is guaranteed to contain 0 instances of `font-size: [0-9]px` or `font-size: 10px`.

---

## 5. Responsive Design & Mobile Adaptations

- **Sidebar / Navigation Drawer**: Desktop renders a 260px fixed sidebar with logo, navigation links, and user card (`.user-mini`). On screens $\le 900$px, the sidebar collapses into a drawer toggled by `#menuToggle`.
- **Data Table Overflow**: All admin and provider tabular ledgers are wrapped in scrollable containers (`overflow-x: auto`) to prevent viewport breaking on smaller devices.
- **Card Grids**: Service cards and incoming job cards utilize CSS Grid with `repeat(auto-fill, minmax(280px, 1fr))` for fluid reflow across mobile, tablet, and desktop viewports.
