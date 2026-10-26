# HutFix — Product & Engineering Roadmap

## Core Hackathon Execution Phases (0–9)

| Phase | Title | Status | Scope Summary |
| :--- | :--- | :---: | :--- |
| **Phase 0** | Baseline Audit & Monorepo Scaffold | **Done** | Code audit, legacy prototype isolation, initial static regression test harness. |
| **Phase 1** | Monorepo Scaffold & DB Schema | **Done** | Local PostgreSQL schema, 8 categories & 11 providers seed, Express `/api/health`. |
| **Phase 2** | JWT Auth & Role Guards | **Done** | Role-based JWT authentication, HTTP-only cookie delivery, role guards, login UI. |
| **Phase 3** | Service Catalog & Smart Matching | **Done** | Multi-factor provider ranking, multipart photo uploads, discovery & request UI. |
| **Phase 4** | Slot Scheduling & Concurrency | **Done** | 1-hour slot generation, PostgreSQL advisory locks against race conditions, suggestions. |
| **Phase 5** | Lifecycle & Role Dashboards | **Done** | Finite state machine, 5-stage customer stepper, 3-bucket provider management. |
| **Phase 6** | Bonus Layer & Documentation | **Done** | Automated invoices, star ratings, notifications, workload capping, docs foundation. |
| **Phase 7** | Design System & Public Pages Overhaul | **Done** | Indigo/violet design tokens, dark mode toggle, complete overhaul of landing, login, and request UI. |
| **Phase 8** | Operational Dashboards & Admin Analytics | **In Progress** | Customer tracking portal overhaul, provider operations deck, print invoice refinement, and admin telemetry. |
| **Phase 9** | Production Hardening & Cloud Deployment | **Pending** | Supabase/Cloud PostgreSQL deployment, automated CI/CD pipeline, and audit logging. |

---

## Extended Roadmap (Optional Phases 9–11)
- **Phase 9: Server-Sent Events (SSE) Live Tracking**: Replace polling with resilient HTTP SSE streams for real-time location and status telemetry.
- **Phase 10: Advanced Admin Analytics & Fraud Detection**: Telemetry dashboards, dispute resolution workflows, dynamic surge pricing analytics, and provider background verification.
- **Phase 11: Progressive Web App (PWA) & Offline Mode**: Service workers, offline caching of booking history, push notifications, and home screen installability on Android and iOS.
