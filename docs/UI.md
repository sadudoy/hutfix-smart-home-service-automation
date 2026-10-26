# HutFix — Frontend & UI Component System

## 1. Overview & Brand Identity

HutFix features a clean, high-trust marketplace UI utilizing the classic Blue/Sky Blue palette, custom responsive stylesheets, and intuitive sidebar layouts for role dashboards:
- **Primary Colors**: Deep Blue (`#003366`), Navy Blue (`#1a365d`), Royal Blue (`#0052cc`), Sky Blue (`#4a90e2`).
- **Surfaces**: Light mode background (`#f4f7f6`), white surface (`#ffffff`), dark mode background (`#0b1120`), dark surface (`#1e293b`).
- **Typography**: Inter / system sans-serif hierarchy.
- **Architectural Paradigm**: Direct API connectivity via `window.API` (`client/js/api.js`), responsive flex/grid layouts with mobile adaptation.

---

## 2. Page Specifications

### `index.html` (Landing & Discovery Portal)
- **Purpose**: Brand introduction, live service category exploration, technician marketplace, and integrated auth / booking modals.
- **Key Sections**:
  - Navbar with brand logo icon, services navigation, dark mode toggle (`#theme-toggle`), and dynamic user menu (`#nav-auth-area`).
  - Hero header with search bar (`#hero-search`, `#search-btn`) and value propositions.
  - Premium Services Grid (`.services-grid`): dynamic category cards (`.service-card.category-trigger`) populated from `GET /api/services`.
  - Available Technicians Section (`#marketplace-section`, `#gigs-grid`): displays available specialists with ratings, prices, and "Book Now" buttons.
  - Direct Booking Modal (`#booking-modal`, `#direct-booking-form`): date, time, location, details, and multipart booking submission via `POST /api/requests`.
  - Auth Modal (`#auth-modal`): tabbed login (`#login-form`) and signup (`#signup-form`) with role selection.

### `customer.html` (Customer Dashboard & Service Tracking)
- **Purpose**: Dedicated customer portal replacing standalone `tracking.html` and `request.html` with a unified sidebar layout.
- **Key Sections**:
  - Top Navbar: Brand logo, dark mode toggle (`#theme-toggle`), notifications bell (`#notif-btn`, `#notif-badge`, `#notif-dropdown`, `#notif-list`), and customer profile avatar.
  - Sidebar Navigation: New Request tab (`#section-book`), My Bookings history tab (`#section-history`), My Profile tab (`#section-profile`), Browse Services link, and Logout (`#logout-btn`).
  - Smart Booking Form (`#booking-form`): category selector from `GET /api/services`, date/time picker, urgency selector (`#book-urgency`), location, and details.
  - Match Result Box (`#match-result-container`, `#match-details`): displays best ranked provider from `POST /api/requests/match` with distance and price. "Confirm" triggers `POST /api/requests`.
  - Booking History (`#bookings-list`): renders customer orders with a 5-stage visual stepper (`.timeline` with `Requested -> Accepted -> On the Way -> In Progress -> Completed`).
  - Order Actions: "View Invoice" link (`/invoice.html?id=...`), "Cancel Booking" for pending jobs, and "Leave a Review" opening `#review-modal` (`POST /api/ratings/by-request/:id`).

### `provider.html` (Provider Operations & Settings Dashboard)
- **Purpose**: Service technician command center for incoming jobs, ongoing tasks, work history, and pricing/area configuration.
- **Key Sections**:
  - Top Navbar: Brand logo, dark mode toggle, and provider avatar (`ui-avatars.com`).
  - Sidebar Navigation: Incoming Requests (`#section-requests`, badge `#request-badge`), Active Jobs (`#section-active`), Job History (`#section-history`), Profile (`#section-profile`), Service Settings (`#section-services`), and Logout (`#logout-btn`).
  - Incoming Requests (`#requests-list`): cards populated from `GET /api/provider/requests?bucket=incoming`, with "Accept" (`POST /api/requests/:id/accept`) and "Reject" (`POST /api/requests/:id/reject`).
  - Active Jobs (`#active-jobs-list`): cards populated from `GET /api/provider/requests?bucket=active`. Includes "Next Step" status progression button calling `PATCH /api/requests/:id/status` (`accepted` -> `on_the_way` -> `in_progress` -> `completed`).
  - Job History (`#history-list`): completed and cancelled orders with invoice links.
  - Service Settings (`#service-settings-form`): configure service charge / base rate (`#service-charge`), service area (`#service-area`), quick price presets (`.price-preset`), and live display (`#display-charge`, `#display-area`), persisted via `PATCH /api/provider/settings`.

### `admin.html` (Platform Administration & Master Ledger)
- **Purpose**: Marketplace administrator control panel for monitoring platform KPIs and master tables.
- **Key Sections**:
  - Top Navbar: Admin shield logo, dark mode toggle, and admin avatar.
  - Sidebar Navigation: Overview tab, Master Ledger tab (`#section-bookings`), Providers tab (`#section-providers`), Users tab (`#section-users`), and Logout (`#logout-btn`).
  - KPI Stat Cards: Total Bookings (`#stat-total-bookings`), Platform Revenue (`#stat-total-revenue`), Active Providers (`#stat-total-providers`), Registered Users (`#stat-total-users`), populated via `GET /api/admin/stats`.
  - Responsive Data Tables: Master bookings ledger (`#admin-bookings-table`), provider directory (`#admin-providers-table`), and user accounts (`#admin-users-table`) wrapped in `<div class="table-responsive" style="overflow-x: auto;">` for horizontal mobile scrolling.

### `invoice.html` (Print-Ready Service Invoice)
- **Purpose**: Clean, professional printable receipt for completed service requests.
- **Key Sections**:
  - Printable invoice container (`.invoice-card`) with HutFix header, invoice number (`#invoice-num`), and issue date (`#invoice-date`).
  - Customer and Provider contact information.
  - Tabular breakdown: Service delivery subtotal (`#service-subtotal`), 5% platform tax (`#service-tax`), and total due (`#service-total`).
  - Action footer with "Back to Dashboard" and "Print Invoice" (`window.print()`).

---

## 3. Stylesheet Organization

- `client/global.css`: Core design variables, CSS reset, typography, navbar, button styles, modal overlays, card containers, and dark mode overrides (`[data-theme="dark"]`).
- `client/auth.css`: Styles for the login and registration modal, input groups, role selection radio switches, and error feedback pills.
- `client/customer.css`: Styles for the customer dashboard, sidebar layout, match results card, 5-stage `.timeline` stepper (with vertical mobile stacking `@media (max-width: 600px)`), and status badges.
- `client/provider.css`: Styles for technician task boards, status indicators, and service settings forms.
- `client/admin.css`: Styles for administrator KPI stat cards, metric counters, data tables, and horizontal table scroll wrappers.

---

## 4. API Client & JavaScript Modules

- `client/js/api.js`: Unified HTTP client `window.API` supporting `request(path, opts)`, `get(path)`, `post(path, body)`, and `patch(path, body)` with credentials and FormData handling.
- `client/global.js`: Landing page controller, category rendering, technician search, booking modal, auth state detection, and theme toggle.
- `client/auth.js`: Authentication modal controller connecting `#login-form` and `#signup-form` to `/api/auth/login` and `/api/auth/register`.
- `client/customer.js`: Customer dashboard controller for service matching, request creation, order history tracking, reviews, and notifications.
- `client/provider.js`: Provider dashboard controller for incoming requests, status progression, and service settings.
- `client/admin.js`: Administrator dashboard controller fetching stats and master tables.
