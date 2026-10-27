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

## Phase 10 — Final UI Implementation (HutFix Reference) & Real Backend Wiring
- **Landed**:
  - Adopted the definitive HutFix reference UI (`client/_reference_fixora/` &rarr; `client/index.html`, `style.css`, `app.js`).
  - Safely archived Phase 9 multi-page UI to `client/_legacy_phase9/` and exposed static assets as an Express fallback to maintain backward compatibility.
  - Scaled entire CSS typographic hierarchy in `client/style.css` to $\ge 11$px (7–10px &rarr; 11–13px, 11–14px &rarr; 14–15px, explicit `.hero h1` 40px and `.page-head h1` 32px), eliminating all sub-11px illegibility defects.
  - Implemented client-side authentication overlay (`#auth-screen`) with instant demo credentials switching (`customer@demo.test`, `provider@demo.test`, `admin@demo.test`) and session logout (`#logoutBtn`).
  - Completely rewired `client/app.js` to real PostgreSQL REST backend endpoints with zero mock data and zero dummy local storage.
  - Sourced category photography dynamically via `client/js/images.js` Unsplash integration across all 8 services.
  - Implemented 5-stage tracking lifecycle, audit timeline, invoice dialog, and review submission in customer view.
  - Wired provider incoming task acceptance/rejection, active task status progression, and earnings ledger.
  - Implemented admin platform overview KPIs, user accounts directory, and master bookings ledger.
  - Added backend endpoints: `GET /api/admin/stats`, `GET /api/admin/users`, `GET /api/admin/bookings`, `GET /api/providers/:userId/profile`, and `GET /api/invoices/mine`.
  - Renamed legacy test suite to `test_phase9.legacy.js` and authored comprehensive `test_phase10.js` verification suite with full regression passing across all prior phases.

---

## Phase 10.1 — UI Hotfix: Sticky Sidebar, Guest Browsing, Profile Editing, Icons & Branding
- **Commit**: `e482ca1`
- **Landed**:
  - Rebranded platform to HutFix with official logo image and Manrope typography.
  - Implemented sticky desktop sidebar (`position: sticky; top: 0; height: 100vh; overflow-y: auto;`).
  - Added guest browsing allowing visitors to explore services without forced login backdrop.
  - Integrated Bootstrap Icons CDN replacing generic unicode symbols across navigation, chips, and cards.
  - Added backend profile update endpoint `PATCH /api/auth/profile` with pgcrypto password hashing.
  - Verification suite `test_phase10_1.js` with 24 checks and full regression passing.

---

## Phase 11 — Customer Experience & Gig Details
- **Landed**:
  - Created `addresses` database migration (`database/migrations/002_add_addresses.sql`) and indexed by `user_id`.
  - Added full Address Book CRUD backend API (`/api/addresses`) with ownership and default-address toggling.
  - Implemented public Gig Details endpoint `GET /api/gigs/:providerId` with provider info, services, reviews, and star breakdown.
  - Implemented customer appointment reschedule flow `PATCH /api/requests/:id/reschedule` with advisory lock concurrency protection and slot clash prevention.
  - Added multi-criteria provider search `GET /api/providers/search` with dynamic sorting, `min_rating`, and `max_price` filters.
  - Built interactive Gig Details SPA view in `client/app.js` with hero photography, provider avatar, "About the Pro", sticky booking card, and reviews breakdown.
  - Added Saved Addresses management UI in Customer Profile and address quick-select in booking modal.
  - Added Reschedule modal in service tracking view.
  - Implemented Mock Checkout step with total computation (5% fee), mock credit card input, and simulated payment processing spinner.
  - Authored comprehensive verification test suite `test_phase11.js` passing 35 functional tests and all prior regressions.

---

## Phase 12 — HutFix Operations, Admin Verification & Real-Time Tracking
- **Landed**:
  - Pure branding alignment to **HutFix** across HTML, client JS, docs, and README.
  - Executed database migration `database/migrations/003_provider_ops.sql` adding `provider_blackouts`, `disputes`, `payout_requests`, and `service_requests` payment columns (`payment_method`, `trx_id`, `sender_number`, `payment_status`).
  - Implemented Server-Sent Events (SSE) real-time streaming endpoint `GET /api/requests/:id/stream` and pub/sub service (`server/services/sse.service.js`) broadcasting status changes and payment updates immediately to clients.
  - Added manual mobile banking payment verification flow (bKash & Nagad):
    - Customer booking flow prompts for bKash/Nagad Merchant transaction ID (TrxID) and sender number.
    - Admin payment clearing ledger (`GET /api/admin/payments`) with one-click `verify` and `reject` actions (`PATCH /api/admin/payments/:id/verify`).
    - Rejection automatically cancels booking and frees provider slot.
  - Provider schedule management:
    - Weekly operating hours API (`GET / PUT /api/provider/availability`) and interactive UI in provider dashboard.
    - Blackout dates CRUD (`GET / POST / DELETE /api/provider/blackouts`) and automated exclusion in multi-factor smart matching.
    - Payout requests (`GET / POST /api/provider/payouts`) with balance calculation from invoices minus previous payouts.
  - Admin operational controls:
    - Admin provider payout approval (`GET /api/admin/payouts`, `PATCH /api/admin/payouts/:id/approve`).
    - Specialist verification toggle (`PATCH /api/admin/users/:id/verify`).
    - Dispute moderation ledger (`GET /api/admin/disputes`, `POST /api/admin/disputes/:id/resolve`).
    - Manual admin appointment assignment (`POST /api/admin/bookings/:id/assign`).
    - Pagination support (`?page=1&limit=10`) across admin users, bookings, and customer requests.
  - Security hardening:
    - Profile password updates now strictly verify `old_password` using pgcrypto `crypt()`.
    - Profile UI provides Old Password input field with validation.
  - Authored comprehensive verification test suite `test_phase12.js` passing 100% of all static, functional, and regression assertions (Phases 0 through 11).

---

## Phase 13+: pending
- Future planned enhancements outlined in `docs/ROADMAP.md`.
