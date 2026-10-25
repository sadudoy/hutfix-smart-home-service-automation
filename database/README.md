# Database Setup Guide — HutFix

This database utilizes standard, portable PostgreSQL. It runs seamlessly on local PostgreSQL during development and can be swapped to Supabase with zero schema or application changes.

## Step-by-Step Initialization

1. Start Postgres locally.
2. `createdb smart_home_service` (or via psql `CREATE DATABASE smart_home_service;`)
3. `psql "$DATABASE_URL" -f database/schema.sql`
4. `psql "$DATABASE_URL" -f database/seed.sql`
5. Verify: `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM service_categories;"` — expect 8
6. Verify providers: `psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM providers;"` — expect at least 10

## Database Portability Contract

- All tables use ANSI/standard PostgreSQL DDL.
- No Supabase-specific extensions (only portable `pgcrypto` is required).
- Database connection is managed exclusively via the `DATABASE_URL` environment variable.
