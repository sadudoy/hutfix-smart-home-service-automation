# HutFix — Database Architecture & Schema Specification

## 1. Relational Schema Overview

### `users`
- **Purpose**: Authenticated user accounts for customers, service providers, and administrators.
- **Columns**: `id BIGSERIAL PRIMARY KEY`, `email TEXT UNIQUE NOT NULL`, `password_hash TEXT NOT NULL`, `role TEXT NOT NULL`, `full_name TEXT NOT NULL`, `phone TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **Constraints**: `CHECK (role IN ('customer', 'provider', 'admin'))`.
- **Indexes**: Primary key on `id`, unique index on `email`.

### `service_categories`
- **Purpose**: High-level home service catalog classifications.
- **Columns**: `id BIGSERIAL PRIMARY KEY`, `slug TEXT UNIQUE NOT NULL`, `name TEXT NOT NULL`, `description TEXT`, `icon TEXT`, `base_price NUMERIC(10,2) NOT NULL DEFAULT 0`, `is_active BOOLEAN NOT NULL DEFAULT TRUE`.
- **Constraints**: Unique constraint on `slug`.
- **Indexes**: Primary key on `id`, unique index on `slug`.

### `providers`
- **Purpose**: Professional profiles associated with provider user accounts.
- **Columns**: `id BIGSERIAL PRIMARY KEY`, `user_id BIGINT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE`, `headline TEXT`, `bio TEXT`, `rating NUMERIC(2,1) NOT NULL DEFAULT 5.0`, `rating_count INTEGER NOT NULL DEFAULT 0`, `latitude NUMERIC(9,6)`, `longitude NUMERIC(9,6)`, `address TEXT`, `years_experience INTEGER NOT NULL DEFAULT 0`, `is_active BOOLEAN NOT NULL DEFAULT TRUE`.
- **Constraints**: Unique constraint on `user_id`.
- **Indexes**: Primary key on `id`, unique index on `user_id`.

### `provider_services`
- **Purpose**: Mapping of which categories each provider offers, including their custom base price.
- **Columns**: `id BIGSERIAL PRIMARY KEY`, `provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE`, `category_id BIGINT NOT NULL REFERENCES service_categories(id) ON DELETE CASCADE`, `price NUMERIC(10,2) NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **Constraints**: `UNIQUE (provider_id, category_id)`.
- **Indexes**: Primary key on `id`, composite unique index on `(provider_id, category_id)`.

### `provider_availability`
- **Purpose**: Weekly recurring operational time windows for providers.
- **Columns**: `id BIGSERIAL PRIMARY KEY`, `provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE`, `weekday SMALLINT NOT NULL`, `start_minute SMALLINT NOT NULL`, `end_minute SMALLINT NOT NULL`.
- **Constraints**: `CHECK (weekday BETWEEN 0 AND 6)`, `CHECK (start_minute < end_minute)`.
- **Indexes**: Primary key on `id`.

### `service_requests`
- **Purpose**: Core entity representing a customer service request lifecycle.
- **Columns**: `id BIGSERIAL PRIMARY KEY`, `customer_id BIGINT NOT NULL REFERENCES users(id)`, `category_id BIGINT NOT NULL REFERENCES service_categories(id)`, `assigned_provider_id BIGINT REFERENCES providers(id)`, `description TEXT`, `urgency TEXT NOT NULL DEFAULT 'normal'`, `address TEXT NOT NULL`, `latitude NUMERIC(9,6)`, `longitude NUMERIC(9,6)`, `preferred_date DATE NOT NULL`, `preferred_start_minute SMALLINT NOT NULL`, `preferred_end_minute SMALLINT NOT NULL`, `contact_phone TEXT`, `image_url TEXT`, `status TEXT NOT NULL DEFAULT 'requested'`, `estimated_price NUMERIC(10,2)`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`, `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **Constraints**: `CHECK (urgency IN ('low', 'normal', 'high', 'urgent'))`, `CHECK (status IN ('requested', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled'))`.
- **Indexes**: `idx_service_requests_status`, `idx_service_requests_customer`, `idx_service_requests_provider`.

### `request_status_events`
- **Purpose**: Append-only audit timeline of all lifecycle events and state transitions.
- **Columns**: `id BIGSERIAL PRIMARY KEY`, `request_id BIGINT NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE`, `status TEXT NOT NULL`, `note TEXT`, `created_by_user_id BIGINT REFERENCES users(id)`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **Indexes**: Primary key on `id`, index on `request_id`.

### `provider_bookings`
- **Purpose**: Reserved slot intervals to guarantee concurrency safety and zero double-booking.
- **Columns**: `id BIGSERIAL PRIMARY KEY`, `provider_id BIGINT NOT NULL REFERENCES providers(id) ON DELETE CASCADE`, `request_id BIGINT NOT NULL UNIQUE REFERENCES service_requests(id) ON DELETE CASCADE`, `slot_date DATE NOT NULL`, `start_minute SMALLINT NOT NULL`, `end_minute SMALLINT NOT NULL`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **Constraints**: `UNIQUE (provider_id, slot_date, start_minute)`, `CHECK (start_minute < end_minute)`.
- **Indexes**: `idx_provider_bookings_provider_date` on `(provider_id, slot_date)`.

### `invoices`
- **Purpose**: Commercial financial record automatically generated upon job completion.
- **Columns**: `id BIGSERIAL PRIMARY KEY`, `request_id BIGINT UNIQUE NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE`, `provider_id BIGINT NOT NULL REFERENCES providers(id)`, `subtotal NUMERIC(10,2) NOT NULL`, `tax NUMERIC(10,2) NOT NULL DEFAULT 0`, `total NUMERIC(10,2) NOT NULL`, `currency TEXT NOT NULL DEFAULT 'BDT'`, `issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **Constraints**: `UNIQUE (request_id)`.
- **Indexes**: Primary key on `id`, unique index on `request_id`.

### `ratings`
- **Purpose**: Verified customer feedback, star ratings, and optional comments on completed jobs.
- **Columns**: `id BIGSERIAL PRIMARY KEY`, `request_id BIGINT UNIQUE NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE`, `customer_id BIGINT NOT NULL REFERENCES users(id)`, `provider_id BIGINT NOT NULL REFERENCES providers(id)`, `stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5)`, `comment TEXT`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **Constraints**: `UNIQUE (request_id)`.
- **Indexes**: Primary key on `id`, unique index on `request_id`.

### `notifications`
- **Purpose**: User alert event stream for request lifecycle progression, bookings, invoices, and reviews.
- **Columns**: `id BIGSERIAL PRIMARY KEY`, `user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE`, `request_id BIGINT REFERENCES service_requests(id) ON DELETE CASCADE`, `kind TEXT NOT NULL`, `title TEXT NOT NULL`, `body TEXT`, `is_read BOOLEAN NOT NULL DEFAULT FALSE`, `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()`.
- **Indexes**: Primary key on `id`, `idx_notifications_user_unread` on `(user_id, is_read, created_at DESC)`.

---

## 2. Seed Data Summary
- **Categories**: 8 primary service domains:
  1. `appliance-repair` — Appliance & Gadget Repair
  2. `electrical` — Electrical Wiring & Diagnostics
  3. `plumbing` — Plumbing & Water Systems
  4. `cleaning-maid` — House Cleaning & Maid Service
  5. `painting` — Interior & Exterior Painting
  6. `carpentry` — Carpentry & Furniture Repair
  7. `pest-control` — Pest Control & Fumigation
  8. `smart-home` — Smart Home & IoT Automation
- **Providers**: 11 licensed specialist service agencies across Dhaka with recurring Monday–Saturday operational hours and category-specific pricing.
- **Demo Users**:
  - Customer: `customer@demo.test` / `demo1234`
  - Provider: `provider@demo.test` / `demo1234`
  - Admin: `admin@demo.test` / `demo1234`

---

## 3. Migration History
- **`001_add_notifications.sql`**: Additive migration creating the `notifications` table and compound index `idx_notifications_user_unread` without modifying or dropping any preexisting schema.
