# HutFix — Smart Home Service Automation

> On-demand, slot-scheduled home services with algorithmic matching, concurrency-safe booking, and automated invoice delivery for the BAUST CSE FEST 2026 Hackathon.

**Status: Phase 9 / 13 complete**

---

## Quick start

Follow these 4 steps to run the complete platform locally:

1. **Configure Environment**: Ensure `.env` is created in the repo root with:
   ```env
   PORT=5000
   NODE_ENV=development
   DATABASE_URL=postgresql://postgres:<your_postgres_password>@localhost:5432/smart_home_service
   JWT_SECRET=super_secret_hackathon_jwt_key_2026
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Database Setup & Migrations**: Ensure PostgreSQL is running, create the database, and apply migrations:
   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   psql "$DATABASE_URL" -f database/seed.sql
   psql "$DATABASE_URL" -f database/migrations/001_add_notifications.sql
   ```
4. **Launch Dev Server**:
   ```bash
   npm run dev
   # Open http://localhost:5000 in your browser
   ```

---

## Demo Credentials Table

All demo accounts use password `demo1234`:

| Role | Email | Password | Persona & Scope |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@demo.test` | `demo1234` | Service seeker in Dhanmondi, Dhaka |
| **Provider** | `provider@demo.test` | `demo1234` | Rahim Electronics & AC Care (Specialist) |
| **Admin** | `admin@demo.test` | `demo1234` | Full system audit and platform supervisor |

---

## Feature Checklist

### Core Features
- [x] ✅ Role-based JWT authentication with secure HTTP-only cookies and role guards.
- [x] ✅ Comprehensive 8-category home services catalog with pricing baselines.
- [x] ✅ Smart matching algorithm scoring availability, rating, distance, price, and workload.
- [x] ✅ Slot-based 1-hour scheduling with advisory locking against race conditions.
- [x] ✅ Finite state machine request lifecycle (requested &rarr; accepted &rarr; on the way &rarr; in progress &rarr; completed).
- [x] ✅ Live customer fulfillment tracking with 5-stage stepper and 3-bucket provider dashboard.

### Bonus Features
- [x] ✅ Automated financial invoice generation on job completion with 5% platform tax.
- [x] ✅ Printable A4-styled customer invoice page (`client/invoice.html`).
- [x] ✅ Verified 5-star customer review & provider aggregate rating recalculation.
- [x] ✅ In-transaction event notification feed with unread count and real-time navbar bells.
- [x] ✅ Workload capping ($\ge 4$ busy-day filter) and urgent priority sorting in provider view.

---

## Architecture
HutFix is structured as a production-grade monorepo containing a Vanilla JS frontend, an Express REST backend, and a PostgreSQL persistence layer. The system decouples domain intelligence into isolated services covering multi-factor matching, advisory-lock scheduling, lifecycle state progression, and in-transaction notifications. All write operations use strict database transactions to guarantee transactional integrity and eliminate concurrency hazards. For an in-depth breakdown of components and data flows, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## API Surface
The complete REST API contract including payload schemas, curl examples, and error codes is detailed in [docs/API.md](docs/API.md).

---

## Testing

The project maintains an automated test suite verifying every layer from static checks to high-concurrency race condition testing:

| Test Suite | Coverage Summary | Status |
| :--- | :--- | :---: |
| `test_phase0.js` | Baseline audit, legacy prototype isolation, and contract integrity | **PASS** |
| `test_phase1.js` | Monorepo layout, schema validation, and seed data integrity | **PASS** |
| `test_phase2.js` | JWT auth, cookie lifecycle, role guards, and login portal | **PASS** |
| `test_phase3.js` | Service catalog, multi-factor matching engine, and booking API | **PASS** |
| `test_phase4.js` | Slot generation, advisory locks, 409 conflict suggestions, and timezone | **PASS** |
| `test_phase5.js` | Lifecycle transitions, tracking page, and 3-bucket provider dashboard | **PASS** |
| `test_phase6.js` | Invoices, ratings, notifications, busy-day filter, and documentation protocol | **PASS** |
| `test_phase7.js` | Modern design system, landing/login/request overhaul, and dark mode toggle | **PASS** |
| `test_phase8.js` | Impeccable redesign, purged AI visual tells, dark mode contrast hardening, 0 detector findings | **PASS** |
| `test_phase9.js` | Restored original prototype UI, backend rewiring, mobile responsive fixes | **PASS** |

Run tests anytime with:
```bash
node test_phase9.js
```

---

## Local vs Supabase
**The One-Line Swap Rule**: HutFix strictly uses standard SQL and standard PostgreSQL connection strings. To switch from local development to a hosted Supabase instance, simply replace `DATABASE_URL` in `.env` with your Supabase PostgreSQL URI — zero application code changes required.

---

## Documentation Index
- [Design System Specification (Impeccable)](docs/DESIGN.md)
- [Architecture & Data Flow](docs/ARCHITECTURE.md)
- [Database Schema & Migrations](docs/DATABASE.md)
- [REST API Specification](docs/API.md)
- [Frontend & Component System](docs/UI.md)
- [5-Minute Demo Script](docs/DEMO.md)
- [Engineering Changelog](docs/CHANGELOG.md)
- [Product Roadmap](docs/ROADMAP.md)
