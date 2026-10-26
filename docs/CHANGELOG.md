# HutFix — Engineering Changelog

## Phase 0 — Baseline Audit & Monorepo Planning
- **Commit**: `8e89cf8`
- **Landed**:
  - Full codebase audit of legacy prototype in `AUDIT.md`.
  - Established isolation contract: moved static prototype to `client/_legacy/`.
  - Authored baseline regression suite `test_phase0.js` with 59 functional tests.

---

## Phase 1 — Monorepo Scaffold, Schema & Database Seeding
- **Commit**: `45b62b2`
- **Landed**:
  - Scaffolding of `client/`, `server/`, `database/`, and `docs/`.
  - Canonical PostgreSQL schema (`database/schema.sql`) and rich seed dataset (`database/seed.sql`) covering 8 categories, 11 providers, and 3 demo users.
  - Express server scaffold (`server/index.js`) with `/api/health` and database connectivity pool.
  - Verification suite `test_phase1.js` with 60 functional tests.

---

## Phase 2 — JWT Authentication, Role Guards & Login UI
- **Commit**: `ae4dabe`
- **Landed**:
  - Role-based JWT authentication (`server/controllers/auth.controller.js`, `server/middleware/auth.js`) supporting customer, provider, and admin roles.
  - Secure HTTP-only cookie delivery (`hutfix_token`) with pgcrypto password verification.
  - Client auth library (`client/js/api.js`, `client/js/auth.js`) and unified login portal (`client/login.html`).
  - Verification suite `test_phase2.js` with 49 functional tests.

---

## Phase 3 — Service Catalog, Smart Matching & Request Creation
- **Commit**: `d67dd67`
- **Landed**:
  - Public services catalog (`GET /api/services`) and customer request creation with multipart uploads.
  - Multi-factor smart matching engine (`server/services/matching.service.js`) scoring availability, rating, distance, price, and workload.
  - Hero and 8-category exploration grid in `client/index.html` and booking workflow in `client/request.html`.
  - Verification suite `test_phase3.js` with 64 functional tests.

---

## Phase 4 — Slot-Based Scheduling & Concurrency Locks
- **Commit**: `8abaead`
- **Landed**:
  - Slot availability engine (`server/services/scheduling.service.js`, `GET /api/providers/:id/slots`).
  - In-transaction PostgreSQL advisory locks (`pg_advisory_xact_lock`) preventing double-booking race conditions with 409 suggestions.
  - Timezone parsing fix (`pg.types.setTypeParser(1082)`) and slot selector in `client/request.html`.
  - Verification suite `test_phase4.js` with 51 functional tests.

---

## Phase 5 — Request Lifecycle, Tracking Page & Provider Dashboard
- **Commit**: `41383fc`
- **Landed**:
  - Formal finite state machine (`server/services/lifecycle.service.js`) governing transitions: requested &rarr; accepted &rarr; on the way &rarr; in progress &rarr; completed.
  - Customer tracking portal (`client/tracking.html`, `client/js/tracking.js`) with live polling and 5-stage stepper.
  - Provider management dashboard (`client/provider.html`, `client/js/provider.js`) with incoming, active, and history task buckets.
  - Verification suite `test_phase5.js` with 72 functional tests.

---

## Phase 6 — Bonus Layer & Documentation Protocol
- **Commit**: `c228575`
- **Landed**:
  - Additive notification engine (`database/migrations/001_add_notifications.sql`, `server/services/notifications.service.js`, `server/controllers/notifications.controller.js`).
  - Automated financial invoicing (`server/controllers/invoices.controller.js`, `client/invoice.html`).
  - Verified customer reviews & provider aggregate ratings (`server/controllers/ratings.controller.js`).
  - Matching workload cap ($\ge 4$ busy-day filter) and urgent priority sorting in provider deck.
  - Production documentation contracts (`docs/ARCHITECTURE.md`, `docs/DATABASE.md`, `docs/API.md`, `docs/UI.md`, `docs/DEMO.md`, `docs/CHANGELOG.md`, `docs/ROADMAP.md`, `README.md`).

---

## Phase 7 — Design System & Public Pages Overhaul
- **Commit**: `858d29b`
- **Landed**:
  - Comprehensive design system with Indigo/Violet token palette (`tokens.css`), surface elevation, Plus Jakarta Sans display typography, and 12 reusable components (`components.css`).
  - Complete modern redesign of public-facing flows: landing discovery portal (`client/index.html`), split authentication gateway (`client/login.html`), and intake/matching cockpit (`client/request.html`).
  - System-wide dark-mode controller (`client/js/theme.js`) wired to persistent storage (`localStorage.hutfix_theme`), OS preferences, and accessible toggles across all application pages.

---

## Phase 8 — Impeccable-Driven Redesign & Dark-Mode Hardening
- **Commit**: `33b3dad`
- **Landed**:
  - Full design system overhaul guided by the **Impeccable Design Standard** (`docs/DESIGN.md`, `PRODUCT.md`).
  - Purged all AI visual tells: eliminated gradient text/fills, glassmorphism (`backdrop-filter`), hover bounce animations (`translateY`), glowing halo shadows, side-tab accent borders, and overused fonts.
  - Selected **Manrope** font family across all 6 application pages with 1.25+ geometric typographic scale.
  - Established Craft Pine (`#0e6258` light / `#14b8a6` dark) and Warm Terracotta (`#b45309` light / `#f59e0b` dark) semantic dual-theme palette.
  - Hardened dark mode with strict mathematical WCAG AAA/AA contrast compliance: body text $\ge 16.7:1$, muted copy $\ge 6.4:1$, buttons $\ge 5.8:1$, borders $\ge 1.5:1$, and status badges $\ge 5.1:1$.
  - 100% token symmetry between `:root` and `[data-theme="dark"]` for all color prefixes.
  - Zero literal hex/rgb/hsl colors in `client/css/components.css` and `client/css/pages.css`.
  - Zero inline `style=` attributes with color/background across all HTML pages, and zero dynamic style assignments in JS.
  - Reduced Impeccable detector antipattern findings from **82 baseline** down to **0** (`.impeccable/detect-after.json`).
  - Authored comprehensive verification test suite `test_phase8.js` (189 passing assertions) with 100% clean regression across Phases 0–7.

---

## Phase 9 — Legacy UI Restoration & Backend Rewiring
- **Landed**:
  - Restored original user prototype UI from `client/_legacy/` (`index.html`, `customer.html`, `provider.html`, `admin.html`, and corresponding CSS files `global.css`, `auth.css`, `customer.css`, `provider.css`, `admin.css`).
  - Purged artificial Phase 7/8 design system (`tokens.css`, `components.css`, `pages.css`, `theme.js`).
  - Fixed original prototype bugs: trailing `k` character in `index.html`, added missing `logo.jpg`, responsive vertical stacking for `.timeline` on mobile screens (<= 600px), horizontal scroll wrapper for admin data tables, dynamic provider avatars via `ui-avatars.com`.
  - Rewired client-side JavaScript to real PostgreSQL/Express backend endpoints via unified `client/js/api.js` (auth modal login & registration, dynamic category catalog, multi-factor smart matching, booking with advisory slot lock, customer request tracking with 5-stage stepper, notification polling, ratings submission, provider dashboard workflow progression, service settings, and admin metrics).
  - Recreated `client/invoice.html` formatted with legacy styling tokens and dynamic invoice retrieval.
  - Added required backend API endpoints: `GET /api/admin/stats`, `GET /api/provider/settings`, `PATCH /api/provider/settings`, and `GET /api/providers`.
  - Authored comprehensive verification test suite `test_phase9.js` with full regression across Phases 0 through 8.

---

## Phase 10+: pending
- Future planned enhancements outlined in `docs/ROADMAP.md`.
