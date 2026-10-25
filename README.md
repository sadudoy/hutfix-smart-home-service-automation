# HutFix — Smart Home Service Automation

A production-grade monorepo platform connecting customers with verified local technicians across 8 specialized service categories. Built for the BAUST CSE FEST 2026 Hackathon.

## Quick Start

1. **Clone & Configure Environment:**
   ```bash
   cp .env.example .env
   # Edit .env to supply your local PostgreSQL password in DATABASE_URL
   ```

2. **Install Dependencies:**
   ```bash
   npm install
   ```

3. **Initialize Database:**
   Follow instructions in [database/README.md](database/README.md):
   ```bash
   psql "$DATABASE_URL" -f database/schema.sql
   psql "$DATABASE_URL" -f database/seed.sql
   ```

4. **Start Development Server:**
   ```bash
   npm run dev
   ```

5. **Verify Health Endpoint:**
   ```bash
   curl http://localhost:3000/api/health
   # Expected response: { "ok": true, "db": "connected", "now": "<timestamp>" }
   ```

## Architecture & Documentation

- [AUDIT.md](AUDIT.md) — Baseline repository audit and reusability assessment.
- [docs/API.md](docs/API.md) — API endpoints documentation.
- [database/README.md](database/README.md) — Database schema, migration, and seed documentation.

> **DB Portability Contract:** Local PostgreSQL for development; Supabase migration = single `.env` `DATABASE_URL` swap (no code changes).
