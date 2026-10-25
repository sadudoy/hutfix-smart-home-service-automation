# HutFix — System Architecture & Design Protocol

## 1. Monorepo Layout
- **`client/`**: Pure Vanilla JS, HTML5, CSS3, and Bootstrap 5 frontend with custom design tokens, responsive from 320px mobile to high-resolution desktop.
- **`server/`**: Modular Node.js + Express REST API organized into controllers, middleware, routes, and domain services.
- **`database/`**: Canonical schema, seed data, and version-controlled additive SQL migrations for PostgreSQL.
- **`docs/`**: Production-grade architectural, operational, API, and developer documentation contracts.

---

## 2. End-to-End Data Flow Diagram
```text
+-----------------------------------------------------------------------------------------+
|                                    Client Browser                                       |
|  (index.html | request.html | tracking.html | provider.html | invoice.html | login.html)|
+-----------------------------------------------------------------------------------------+
                                           |
                                [HTTP Fetch + Cookies]
                                           v
+-----------------------------------------------------------------------------------------+
|                                 Express HTTP Server                                     |
|  (Helmet | CORS | Morgan | CookieParser | Express JSON | Static Uploads & Assets)       |
+-----------------------------------------------------------------------------------------+
                                           |
                                  [API Route Dispatch]
                                           v
+-----------------------------------------------------------------------------------------+
|                              Route Handlers & Role Guards                               |
|   /api/auth       -> authRouter       -> requireAuth / requireRole                      |
|   /api/services   -> servicesRouter   -> public                                         |
|   /api/providers  -> providersRouter  -> public / slots                                 |
|   /api/requests   -> requestsRouter   -> requireAuth (customer / provider / admin)      |
|   /api/provider   -> providerRouter   -> requireAuth (role: provider)                   |
|   /api/invoices   -> invoicesRouter   -> requireAuth (scoped ownership)                 |
|   /api/ratings    -> ratingsRouter    -> requireAuth (role: customer)                   |
|   /api/notifications -> notifRouter   -> requireAuth                                    |
+-----------------------------------------------------------------------------------------+
                                           |
                                  [Domain Controllers]
      requests.controller | invoices.controller | ratings.controller | notifications.controller
                                           |
                                           v
+-----------------------------------------------------------------------------------------+
|                                     Domain Services                                     |
|                                                                                         |
|  +-----------------------+   +-----------------------+   +---------------------------+  |
|  |   Matching Service    |   |  Scheduling Service   |   |     Lifecycle Service     |  |
|  |  (Ranking, Haversine, |   | (Advisory locks, slot |   | (State machine, valid     |  |
|  |   Workload capping)   |   |  intervals, conflicts)|   |  transitions, permissions)|  |
|  +-----------------------+   +-----------------------+   +---------------------------+  |
|                                          |                                              |
|                                          v                                              |
|                              +-----------------------+                                  |
|                              | Notifications Service |                                  |
|                              | (In-transaction feeds)|                                  |
|                              +-----------------------+                                  |
+-----------------------------------------------------------------------------------------+
                                           |
                              [pg.Pool / Transaction Client]
                                           v
+-----------------------------------------------------------------------------------------+
|                                  PostgreSQL Database                                    |
|   (users, service_categories, providers, provider_services, provider_availability,      |
|    service_requests, request_status_events, provider_bookings, invoices, ratings,       |
|    notifications)                                                                       |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Matching Algorithm
The **Matching** engine (`server/services/matching.service.js`) selects and ranks eligible service providers for incoming requests:

1. **Category & Availability Gate**: Providers must be active, registered for the category slug, and have defined operational hours covering `[preferred_start_minute, preferred_end_minute]` on the requested weekday (`getUTCDay()`).
2. **Busy-day filter (Workload Cap)**: Before scoring, providers with **$\ge 4$** total bookings across all categories on `preferred_date` are excluded (`w.day_bookings >= 4`).
3. **Multi-Factor Scoring Formula**:
   - Availability Score: $1.0$ (guaranteed by query filter) $\times 0.30$
   - Rating Score: $\min(1.0, \text{rating} / 5.0) \times 0.25$
   - Distance Score: $\max(0, 1 - \min(\text{distance\_km}, 20) / 20) \times 0.20$ (default $0.5$ if coordinates missing)
   - Price Score: $(1 - (\text{price} - \min) / (\max - \min)) \times 0.15$ (or $1.0$ if single price)
   - Workload Score: $\max(0, 1 - \min(\text{day\_bookings}, 5) / 5) \times 0.10$
4. **Urgency Multiplier**: If urgency is `'urgent'` or `'high'`, composite score is multiplied by $1.10$ (capped at $1.0$).
5. **Output**: Top 5 scored candidates sorted descending with transparent `breakdown` keys and `workload_slots_used`.

---

## 4. Scheduling & Concurrency Control
The **Scheduling** service (`server/services/scheduling.service.js`) manages booking slots and prevents double-booking:

1. **1-Hour Slot Generation**: Evaluates provider operating windows and excludes intervals that overlap existing rows in `provider_bookings`.
2. **Advisory Lock Key**: Every booking attempt acquires an in-transaction Postgres advisory lock before checking or writing:
   ```sql
   SELECT pg_advisory_xact_lock(hashtext('booking:' || provider_id || ':' || preferred_date || ':' || start_minute));
   ```
3. **Conflict Resolution & Suggestions**: If a slot is booked between lookup and submission, the server yields `409 Conflict` containing alternative slot `suggestions` on the same date.
4. **Timezone DATE Parser**: In `server/config/db.js`, `pg.types.setTypeParser(1082, (str) => str)` prevents Node's `pg` driver from converting pure SQL `DATE` types (`YYYY-MM-DD`) into local midnight UTC timestamps.

---

## 5. Lifecycle State Machine
Request state progression is strictly governed by the **Lifecycle** engine (`server/services/lifecycle.service.js`). Unauthorized or out-of-order transitions are rejected with `400 Bad Request` or `403 Forbidden`.

### State Transition Table (`ALLOWED`)
| Current Status | Allowed Next States | Permitted Roles | Actions Triggered |
| :--- | :--- | :--- | :--- |
| `requested` | `accepted`, `cancelled` | Provider (`accepted`/`reject`), Customer (`cancelled`) | Notify parties, free booking on cancel/reject |
| `accepted` | `on_the_way`, `cancelled` | Provider (`on_the_way`), Customer (`cancelled`) | Notify customer, progress stepper |
| `on_the_way` | `in_progress`, `cancelled` | Provider (`in_progress`), Admin | Notify customer, progress stepper |
| `in_progress` | `completed` | Provider (`completed`) | Auto-generate invoice, notify customer |
| `completed` | *(none - terminal)* | Customer (Rate service) | Issue review, update provider aggregate |
| `cancelled` | *(none - terminal)* | *(terminal)* | Slot released immediately in `provider_bookings` |

---

## 6. DB Portability Contract
The platform adheres strictly to the **Portability** contract:
- Single connection string: `DATABASE_URL=postgres://user:pass@host:5432/dbname`.
- Strictly standard PostgreSQL SQL syntax (no custom engine extensions).
- Pure `pgcrypto` cryptographic hashing for user password records.
- Plain SQL migration files in `database/migrations/`.
- **Zero-code switch to Supabase**: Changing `.env` from local Postgres to Supabase connection string requires zero codebase modifications.

---

## 7. Authentication & Role Guards
- **Token Delivery**: HTTP-only, SameSite cookie named `hutfix_token` (with Bearer Authorization header fallback for API clients).
- **JWT Payload**: `{ sub: user.id, email: user.email, role: 'customer' | 'provider' | 'admin' }`.
- **Guards**: `requireAuth` verifies signature against `JWT_SECRET`; `requireRole(...roles)` validates role permissions.
