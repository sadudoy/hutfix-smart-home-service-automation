# HutFix — On-Demand Home Services Marketplace

<p align="center">
  <img src="client/assets/images/logo.jpg" alt="HutFix Logo" width="140">
</p>

<p align="center">
  <strong>Enterprise-Grade Home Services Booking Platform</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-v18+-339933?style=flat-square&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/PostgreSQL-v14+-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Architecture-MPA-blueviolet?style=flat-square" alt="Architecture">
  <img src="https://img.shields.io/badge/Security-RBAC%20%7C%20pgcrypto-2ea44f?style=flat-square" alt="Security">
  <img src="https://img.shields.io/badge/Currency-BDT-informational?style=flat-square" alt="Currency">
</p>

---

## Overview

**HutFix** is a production-grade, multi-tenant marketplace platform engineered to bridge end-consumers with vetted home service technicians—spanning HVAC maintenance, electrical repairs, plumbing, and housekeeping.

Architected with **Node.js**, **Express.js**, and an ACID-compliant **PostgreSQL** storage layer, the system provides dedicated operational dashboards for customers, service partners, and platform administrators. Key capabilities include concurrency-safe booking pipelines, transactional monetary integrity, role-based access controls, and low-latency status dispatching via Server-Sent Events (SSE).

---

## Technical Specifications

### System Prerequisites

| Runtime / Component | Requirement      | Operational Context                                   |
| :------------------ | :--------------- | :---------------------------------------------------- |
| **Node.js**         | `>= 18.0.0`      | Core application execution environment                |
| **PostgreSQL**      | `>= 14.0`        | Relational persistence layer and security primitives  |
| **Client Engine**   | Modern Standards | Chromium, Gecko, or WebKit runtime with ECMAScript 6+ |

### Core Architecture & Dependencies

| Tier                    | Component            | Specification                                                     |
| :---------------------- | :------------------- | :---------------------------------------------------------------- |
| **Frontend Core**       | User Interface       | Vanilla JavaScript (ES6+), HTML5, CSS3 Custom Properties          |
| **UI Components**       | Visual Assets        | Bootstrap Icons                                                   |
| **Client Architecture** | Application Delivery | Multi-Page Application (MPA) Structure                            |
| **Application Layer**   | HTTP Server          | Node.js with Express.js REST Framework                            |
| **Data Layer**          | RDBMS                | PostgreSQL managed via native `pg` connection pooling             |
| **Identity & Sessions** | Authentication       | Stateless JWT transmitted over `HttpOnly`, `SameSite=Lax` cookies |
| **Cryptography**        | Data Security        | PostgreSQL `pgcrypto` (`crypt()`, `gen_salt()`)                   |
| **Event Stream**        | Live Updates         | Native Server-Sent Events (SSE) Protocol                          |
| **Fiscal Scope**        | Localization         | Bangladeshi Taka (BDT)                                            |

---

## Platform Visuals

### Portal Interfaces

|             Customer Portal             |           Provider Control Center           |
| :-------------------------------------: | :-----------------------------------------: |
| <img src="screenshots\home.png" alt=""> | <img src="screenshots\provider.png" alt=""> |

### Operations & Booking

|         Administrative Analytics         |        Transactional Checkout Flow         |
| :--------------------------------------: | :----------------------------------------: |
| <img src="screenshots\admin.png" alt=""> | <img src="screenshots\booking.png" alt=""> |

---

## Directory Organization

```text
hutfix/
│
├── client/                               # Presentation Layer
│   ├── css/
│   │   └── style.css                     # Global design system, theme tokens, layout
│   ├── js/
│   │   ├── global.js                     # Shared utilities, auth guards, shell handlers
│   │   ├── index.js                      # Discovery catalog logic
│   │   ├── login.js                      # Authentication pipeline client
│   │   ├── customer-*.js                 # Customer dashboard controllers
│   │   ├── provider-*.js                 # Provider console controllers
│   │   ├── admin-*.js                    # Administrative management scripts
│   │   └── invoice.js                    # Document compilation and print formatting
│   ├── assets/images/                    # Brand assets, static images, icon sets
│   ├── index.html                        # Application entry interface
│   ├── login.html                        # Identity portal
│   ├── gig-details.html                  # Service specification and scheduling
│   ├── provider-public-profile.html      # Public credential directory
│   └── ...                               # Domain views
│
├── server/                               # Application Layer
│   ├── config/                           # Environment and pooled client parameters
│   ├── controllers/                      # Request-response business orchestration
│   ├── middleware/                       # RBAC, boundary security, asset ingestion
│   ├── routes/                           # REST endpoint declarations
│   ├── services/                         # Scheduling, matching, SSE broadcast pipelines
│   └── index.js                          # Server initialization sequence
│
├── database/                             # Persistence Layer
│   ├── schema.sql                        # DDL table structures, indexes, constraints
│   ├── migrations/                       # Incremental schema evolution scripts
│   └── seed.sql                          # Deterministic development baseline fixtures
│
├── package.json                          # Manifest, lifecycle hooks, and dependencies
├── .env.example                          # Canonical environment configuration schema
├── .gitignore                            # VCS boundary specifications
└── README.md                             # System operational manual
```

---

## Deployment & Setup Guide

### 1. Environment Configuration

Clone the configuration template and specify your environment parameters:

```bash
cp .env.example .env
```

```ini
PORT=3000
NODE_ENV=development
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/hutfix
JWT_SECRET=your_super_secret_key
```

### 2. Dependency Management

Provision runtime and development packages:

```bash
npm install
```

### 3. Database Initialization

Execute the Data Definition Language (DDL) scripts and incremental schema migrations:

```bash
psql -U postgres -d hutfix -f database/schema.sql
psql -U postgres -d hutfix -f database/migrations/*.sql
```

### 4. Deterministic Fixture Seeding

Inject base access roles, system operators, and test fixtures:

```bash
psql -U postgres -d hutfix -f database/seed.sql
```

### 5. Runtime Launch

Initiate the development server:

```bash
npm run dev
```

Platform Endpoint: `http://localhost:3000`

---

## Standard Development Credentials

| Access Level         | Identifier           | Secret Key | Scope & Authorization                             |
| :------------------- | :------------------- | :--------- | :------------------------------------------------ |
| **Administrator**    | `admin@demo.test`    | `demo1234` | Complete platform governance and financial audits |
| **Service Provider** | `provider@demo.test` | `demo1234` | Rahim Electronics (4 active service listings)     |
| **Customer**         | `customer@demo.test` | `demo1234` | End-consumer booking and invoicing interface      |

---

## System Architecture & Security Controls

### Identity and Session Management

- **Credential Storage**: Cryptographically secured through PostgreSQL `pgcrypto` utilizing salt-generated routines (`crypt(..., gen_salt('bf'))`).
- **Transport Protection**: Session tokens are isolated within `HttpOnly` flags to mitigate Cross-Site Scripting (XSS) vectors, configured with `SameSite=Lax`.
- **Token Rotation**: Password reset mechanisms employ cryptographically secure pseudo-random tokens bound to a strict 60-minute time-to-live (TTL).

### Role-Based Access Control (RBAC)

API authorization is guarded by modular middleware filters enforcing least-privilege principles:

```text
Incoming Request ──> requireAuth ──> requireRole('admin' | 'provider' | 'customer') ──> Handler
                                     └── Fail: 403 Forbidden
```

Cross-role access violations terminate with deterministic `403 Forbidden` responses.

### Financial Transaction Integrity

- **Precision Arithmetic**: Balances, order totals, and platform cuts use PostgreSQL `NUMERIC(10, 2)` to eliminate floating-point representation drift.
- **Two-Phase Settlement**: Mobile Financial Services (bKash, Nagad) enter the system under a strict `PENDING` state.
- **Manual Verification Boundary**: Final confirmation requires manual Transaction ID (TrxID) validation by an administrator prior to state transition.
- **Payout Clearance**: Technician earnings distributions are handled via an asynchronous request queue requiring administrative verification.

### Concurrency Controls & Race Condition Prevention

Time-slot contention is resolved at the database transaction layer using explicit transactional advisory locks:

```sql
SELECT pg_advisory_xact_lock(hashtext(provider_id::text || slot_date::text));
```

Physical storage layers duplicate this guarantee via composited domain constraints:

```sql
ALTER TABLE provider_bookings
ADD CONSTRAINT uq_provider_slot
UNIQUE(provider_id, slot_date, start_minute);
```

### Event-Driven Communication Pipeline

Real-time telemetry and order transitions are broadcast through Server-Sent Events (SSE), keeping consumer and technician states synchronized without HTTP polling:

```text
[Accepted] ──────> [On the Way] ──────> [In Progress] ──────> [Completed]
```

### Data Integrity Constraints

- **Evaluation Ranges**: Service ratings are bound to physical limits:
  ```sql
  CONSTRAINT chk_rating_range CHECK (stars BETWEEN 1 AND 5)
  ```
- **Referential Integrity**: Cascading strategies (`ON DELETE CASCADE`) are selectively declared to enforce clean deletion boundaries across orphaned relational records.

---

## Author & Maintainer

<p align="center">
  <strong>Sad Ibna Forid</strong>
  <br><br>
  <a href="https://www.linkedin.com/in/sadudoy">LinkedIn</a>
  &nbsp; | &nbsp;
  <a href="https://github.com/sadudoy">GitHub</a>
  &nbsp; | &nbsp;
  <a href="mailto:sadudoy29@gmail.com">Email</a>
  &nbsp; | &nbsp;
  <a href="https://wa.me/8801776942272">WhatsApp</a>
</p>

---

<p align="center">
  <sub>Designed and developed by Sad Ibna Forid</sub>
</p>

<p align="center">
  <sub>HutFix Platform Architecture Documentation &copy; 2026. Authored by Sad Ibna Forid.</sub>
</p>
