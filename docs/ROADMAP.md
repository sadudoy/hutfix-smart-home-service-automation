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
| **Phase 8** | Impeccable Redesign & Dark-Mode Hardening | **Done** | Purged AI tells, Manrope font, Craft Pine/Warm Terracotta palette, WCAG AAA/AA contrast, 0 detector findings. |
| **Phase 9** | Legacy UI Restoration & Backend Rewiring | **Done** | Restored user prototype UI, purged artificial tokens, fixed mobile responsive bugs, rewired JS to Express/Postgres backend. |
| **Phase 10** | Final Fixora UI & Real Backend Wiring | **Done** | Fixora reference UI adoption, scaled typography (>=11px), strict RBAC, admin analytics, and live lifecycle wiring. |
| **Phase 11** | Production Hardening & Cloud Deployment | **In Progress** | Supabase/Cloud PostgreSQL deployment, automated CI/CD pipeline, and audit logging. |

---

## Extended Roadmap (Optional Phases 11–13)
- **Phase 11: Production Hardening & Cloud Deployment**: Supabase/Cloud PostgreSQL deployment, automated CI/CD pipeline, and audit logging.
- **Phase 12: Server-Sent Events (SSE) Live Tracking**: Replace polling with resilient HTTP SSE streams for real-time location and status telemetry.
- **Phase 13: Progressive Web App (PWA) & Offline Mode**: Service workers, offline caching of booking history, push notifications, and home screen installability on Android and iOS.
