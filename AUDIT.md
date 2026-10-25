# REPOSITORY AUDIT & BASELINE (PHASE 0)

**Project:** BAUST CSE FEST 2026 Hackathon — Smart Home Service Automation  
**Platform Name:** HutFix / HutFix Pro  
**Audit Date:** October 25, 2026  
**Auditor:** Antigravity (Advanced Agentic Coding Pair Programmer)  
**Mode:** READ-ONLY Inspection & Baseline Verification  

---

## 1. INSPECT FIRST — FULL FILE-LEVEL AUDIT

### A. File Tree

The repository currently consists of a flat, unstructured static frontend prototype with client-side mock storage and legacy Firebase configuration files:

```text
D:\CSE\Projects\Smart Home Service Automation\
├── .firebase/
│   └── hosting..cache                       (6,847 bytes)
├── images/
│   └── logo.jpg                             (49,917 bytes)
├── .firebaserc                              (5 lines, 53 bytes)
├── .gitignore                               (69 lines, 1,210 bytes)
├── 404.html                                 (33 lines, 1,808 bytes)
├── admin.css                                (92 lines, 2,318 bytes)
├── admin.html                               (159 lines, 7,461 bytes)
├── admin.js                                 (140 lines, 6,300 bytes)
├── auth.css                                 (305 lines, 6,930 bytes)
├── auth.js                                  (209 lines, 7,849 bytes)
├── customer.css                             (209 lines, 5,377 bytes)
├── customer.html                            (185 lines, 8,197 bytes)
├── customer.js                              (378 lines, 15,800 bytes)
├── db.js                                    (460 lines, 17,587 bytes)
├── firebase.json                            (10 lines, 129 bytes)
├── global.css                               (997 lines, 14,429 bytes)
├── global.js                                (342 lines, 14,195 bytes)
├── index.html                               (460 lines, 14,980 bytes)
├── provider.css                             (173 lines, 4,249 bytes)
├── provider.html                            (475 lines, 17,644 bytes)
└── provider.js                              (574 lines, 25,352 bytes)
```

- **Total Tracked Workspace Files:** 20 files
- **Directories:** `images/`, `.firebase/`, `.git/`

---

### B. HTML Files Audit

#### 1. `index.html`
- **File Path:** `index.html`
- **Approx Line Count:** 460 lines (14,980 bytes)
- **Page Purpose / Screen Name:** Public Landing Page, Service Category Catalog, Technician Marketplace, Direct Booking Modal, and Authentication Modal (Login / Sign Up).
- **Sections Present:**
  - Preloader overlay (`#loader-wrapper` with `.loader` animation).
  - Navigation bar (`.navbar` with logo `.logo-container`, brand "HutFix", `#services` link, dark mode toggle `#theme-toggle`, and auth container `#nav-auth-area`).
  - Hero slider container (`.hero-slider-container` / `.hero-content` with badge "Fast & Reliable", title "Everyday Services, Automated.", input `#hero-search`, and search button `#search-btn`).
  - Premium Services Catalog (`#services` with 9 category cards: AC & Appliance, Plumbing, Electrical, Cleaning, Carpentry, Painting, Gardening, Security, IT & Networking).
  - Dynamic Marketplace (`#marketplace-section`, hidden by default, contains `#gigs-grid` rendered by JavaScript).
  - Direct Booking Modal (`#booking-modal` with `.auth-box`, close button `#close-booking`, and `#direct-booking-form`).
  - Auth Modal (`#auth-modal` with tabs `.auth-tabs`, close button `#close-auth`, `#login-form`, and `#signup-form`).
- **All `<form>` Elements:**
  - `<form id="direct-booking-form">`:
    - Hidden inputs: `#book-provider-id`, `#book-provider-name`, `#book-provider-category`, `#book-provider-price`.
    - `#book-date` (type="date", required).
    - `#book-time` (type="time", required).
    - `#book-location` (type="text", placeholder="Your Address / Area", required).
    - `#book-details` (`<textarea>`, rows="3", placeholder="Briefly describe the issue...").
    - Submit button: `type="submit"` ("Confirm Booking").
  - `<form id="login-form">`:
    - `#login-email` (type="email", placeholder="Email Address", required).
    - `#login-password` (type="password", placeholder="Password", required).
    - Error container: `#login-error`.
    - Submit button: `type="submit"` ("Login").
  - `<form id="signup-form">`:
    - Role radio group: `name="role"` with `#role-customer` (checked, value="customer") and `#role-provider` (value="provider").
    - `#signup-name` (type="text", placeholder="Full Name", required).
    - `#signup-email` (type="email", placeholder="Email Address", required).
    - `#signup-password` (type="password", placeholder="Password", required).
    - Conditional dropdown `#provider-category-group`: `<select id="signup-provider-category">` with 10 options.
    - Error container: `#signup-error`.
    - Submit button: `type="submit"` ("Create Account").
- **Buttons / CTAs and Wiring:**
  - `.logo-container`: Navigates to `index.html`.
  - `#theme-toggle`: Toggles `data-theme="dark"` attribute on document root (handled in `global.js`).
  - `.auth-trigger`: Opens `#auth-modal` (handled in `auth.js`).
  - `#search-btn`: Reads `#hero-search` input and executes provider search (handled in `global.js`).
  - `.category-trigger` (on each service card): Filters technicians by category and scrolls to `#marketplace-section` (handled in `global.js`).
  - Dynamic `.gig-footer button`: Triggers `window.initiateBooking()` which opens `#booking-modal`.
  - `#close-booking`, `#close-auth`: Closes corresponding overlay modals.
- **External CDN Links:**
  - Google Fonts Inter (`https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap`).
  - FontAwesome 6.4.0 (`https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css`).
  - No Bootstrap CDN linked.
- **Inline `<script>` or `<style>` Blocks & Syntax Issues:**
  - No `<style>` blocks; extensive inline `style="..."` attributes on inputs and modal buttons.
  - Linked scripts at bottom: `db.js`, `global.js`, `auth.js`.
  - **Syntax Bug:** Line 460 contains a trailing character `k` after the closing tag: `</html>k`.

#### 2. `customer.html`
- **File Path:** `customer.html`
- **Approx Line Count:** 185 lines (8,197 bytes)
- **Page Purpose / Screen Name:** Customer Dashboard & Self-Service Portal (Service Booking Request, Match Recommendation, Booking History with 5-stage Tracker, Profile Management, Service Review & Rating).
- **Sections Present:**
  - Top navigation bar (`.navbar` with logo "HutFix", `#theme-toggle`, user avatar `#nav-avatar`, and name `#nav-username`).
  - Sidebar layout (`.sidebar` with tabs: `#section-book` "New Request", `#section-history` "My Bookings", `#section-profile` "Profile", `#logout-btn` "Logout").
  - Content section `#section-book`: Contains `#booking-form` and hidden `#match-result-container`.
  - Content section `#section-history`: Contains `#bookings-list` and "Browse More Services" button.
  - Content section `#section-profile`: Contains `#profile-form`.
  - Review Modal (`#review-modal` with 5-star interactive picker `#star-rating` and `#review-form`).
- **All `<form>` Elements:**
  - `<form id="booking-form">`:
    - `<select id="book-category" required>` with 10 options.
    - `<select id="book-urgency">` (Normal, Urgent (Within 2 hrs)).
    - `<input type="date" id="book-date" required>`.
    - `<input type="time" id="book-time" required>`.
    - `<input type="text" id="book-location" placeholder="e.g., Dhanmondi, Mirpur" required>`.
    - `<textarea id="book-details" rows="3" placeholder="Briefly describe the issue...">`.
    - Submit button: `type="submit"` ("Find Best Provider").
  - `<form id="profile-form">`:
    - `<input type="text" id="prof-name" required>`.
    - `<input type="email" id="prof-email" readonly style="opacity: 0.7">`.
    - `<input type="password" id="prof-password" placeholder="Leave blank to keep current">`.
    - Submit button: `type="submit"` ("Save Changes").
  - `<form id="review-form">`:
    - Hidden inputs: `#review-provider-id`, `#review-booking-id`, `#review-score`.
    - `<textarea id="review-comment" placeholder="Leave a comment (optional)..." rows="3">`.
    - Submit button: `type="submit"` ("Submit Review").
- **Buttons / CTAs and Wiring:**
  - Sidebar menu items (`li[data-target]`): Toggle active sections and trigger `renderBookings()` (handled in `customer.js`).
  - `#logout-btn`: Clears session from `localStorage` and redirects to `index.html`.
  - `#booking-form` submit: Simulates matching delay, calls `MockDB.findMatch()`, and reveals `#match-result-container`.
  - `#confirm-booking-btn`: Calls `MockDB.createBooking()` and switches to "My Bookings".
  - `#cancel-booking-btn`: Cancels match view and restores booking form.
  - `#close-review`: Closes rating modal.
  - `.star-btn`: 1-to-5 star hover/selection event handlers.
- **External CDN Links:**
  - Google Fonts Inter.
  - FontAwesome 6.4.0.
  - No Bootstrap CDN linked.
- **Inline `<script>` or `<style>` Blocks:**
  - No `<script>` or `<style>` tags. Extensive inline styles for modal textarea and star icons.
  - Linked scripts: `db.js`, `global.js`, `customer.js`.

#### 3. `provider.html`
- **File Path:** `provider.html`
- **Approx Line Count:** 475 lines (17,644 bytes)
- **Page Purpose / Screen Name:** Provider Workspace / Operations Panel (Incoming job requests with badge, Active jobs lifecycle management with mock GPS map, Completed history, Profile editor with photo upload, Service & Pricing settings).
- **Sections Present:**
  - Navigation bar (`.navbar` with "HutFix Pro", `#theme-toggle`, avatar `#nav-avatar`, Pro badge `#nav-username`).
  - Sidebar (`.sidebar` with `#section-requests` + `#request-badge`, `#section-active`, `#section-history`, `#section-profile`, `#section-services`, `#logout-btn`).
  - Content section `#section-requests`: Lists pending incoming requests with Accept/Reject actions.
  - Content section `#section-active`: Lists active jobs with mock map pin and interactive status transition dropdown.
  - Content section `#section-history`: Lists completed/rejected jobs and earned payouts.
  - Content section `#section-profile`: Avatar upload `#upload-avatar`, image preview `#profile-preview`, and `#provider-profile-form`.
  - Content section `#section-services`: `#service-settings-form` with hourly rate input, area selector, 6 quick price presets, service tags, availability toggle, and live `#service-settings-display`.
- **All `<form>` Elements:**
  - File input (standalone): `<input type="file" id="upload-avatar" accept="image/png,image/jpeg,image/webp" style="display: none">`.
  - `<form id="provider-profile-form">`:
    - `<input type="text" id="prof-name" required>`.
    - `<select id="prof-category">` with 10 options.
    - Submit button: `type="submit"` ("Update Profile").
  - `<form id="service-settings-form">`:
    - `<input type="number" id="service-charge" required min="100" step="50">`.
    - `<select id="service-area" required>` (Dhaka, Gazipur, Narayanganj, Savar, Other).
    - 6 preset buttons: `.price-preset` (৳300, ৳500, ৳800, ৳1000, ৳1500, ৳2000).
    - `<input type="text" id="service-types" placeholder="e.g., AC Repair, Installation, Maintenance">`.
    - `<input type="checkbox" id="service-available" checked>`.
    - Submit button: `type="submit"` ("Save Service Settings").
- **Buttons / CTAs and Wiring:**
  - Sidebar tabs: Switch active panels (handled in `provider.js`).
  - `label[for="upload-avatar"]`: Triggers hidden file picker, reads file via `FileReader`, and updates avatar.
  - `.price-preset` buttons: Populate `#service-charge` input dynamically.
  - Dynamic "Accept Job": Calls `window.acceptJob()`, updating status to "Accepted".
  - Dynamic "Reject": Calls `window.rejectJob()`, updating status to "Rejected".
  - Dynamic status `<select onchange="changeStatus(...)">`: Transitions job through "Accepted", "On the Way", "In Progress", "Completed".
- **External CDN Links:**
  - Google Fonts Inter.
  - FontAwesome 6.4.0.
  - No Bootstrap CDN linked.
- **Inline `<script>` or `<style>` Blocks:**
  - Extensive inline style blocks in HTML layout.
  - Linked scripts: `db.js`, `global.js`, `provider.js`.

#### 4. `admin.html`
- **File Path:** `admin.html`
- **Approx Line Count:** 159 lines (7,461 bytes)
- **Page Purpose / Screen Name:** System Administrator Control Panel / Master Ledger (Platform KPI statistics, Complete bookings ledger, Registered service providers directory, Registered customer & provider account directory).
- **Sections Present:**
  - Navigation bar (`.navbar` with "HutFix Admin.", `#theme-toggle`, admin avatar, username).
  - Sidebar menu (`.sidebar` with `#section-overview`, `#section-bookings`, `#section-providers`, `#section-users`, `#logout-btn`).
  - Content section `#section-overview`: 4 metric cards (`#stat-total-bookings`, `#stat-total-revenue`, `#stat-total-providers`, `#stat-total-users`).
  - Content section `#section-bookings`: Data table `#admin-bookings-table` (Order ID, Customer, Provider, Service, Price, Status).
  - Content section `#section-providers`: Data table `#admin-providers-table` (Provider Name, Category, Base Rate, Rating, Jobs Done).
  - Content section `#section-users`: Data table `#admin-users-table` (Avatar + Name, Email, Account Role).
- **All `<form>` Elements:** None. Purely a read-only reporting table.
- **Buttons / CTAs and Wiring:**
  - Sidebar menu items: Switch visible sections (handled in `admin.js`).
  - `#logout-btn`: Clears `currentUser` from `localStorage` and redirects to `index.html`.
- **External CDN Links:** Google Fonts Inter, FontAwesome 6.4.0.
- **Inline `<script>` or `<style>` Blocks:** None.
- **Linked scripts:** `db.js`, `global.js`, `admin.js`.

#### 5. `404.html`
- **File Path:** `404.html`
- **Approx Line Count:** 33 lines (1,808 bytes)
- **Page Purpose / Screen Name:** Default Firebase Hosting 404 Error Page.
- **Sections Present:** Center-aligned error box (`#message`) with "404 Page Not Found" and Firebase CLI boilerplate text.
- **All `<form>` Elements:** None.
- **Buttons / CTAs:** None.
- **External CDN Links:** None.
- **Inline `<script>` or `<style>` Blocks:** Inline `<style media="screen">` tag (lines 8–22) styling cards and mobile breakpoint (`@media (max-width: 600px)`).

---

### C. JS Files Audit

#### 1. `db.js`
- **File Path:** `db.js`
- **Approx Line Count:** 460 lines (17,587 bytes)
- **What it does:** In-browser client-side mock database (`MockDB` object). Simulates a persistence layer using `window.localStorage` keys: `hf_providers`, `hf_bookings`, `hf_users`, `hf_reviews`. Implements default provider seeding, user registration, plain-text credential verification, provider profile updates, keyword searching, provider matching algorithm, booking generation, status mutations, and customer review calculations.
- **Hardcoded Data Shapes:**
  - Seed providers list in `seedProviders()`:
    ```javascript
    {
        id: "p1",
        name: "Rahim Electronics",
        category: "AC & Appliance",
        rating: 4.8,
        pricePerHour: 1000,
        serviceCharge: 1000,
        jobsCompleted: 142,
        serviceArea: "Dhaka",
        serviceTypes: ["AC Repair", "Appliance Repair", "Refrigerator"],
        available: true,
        totalReviews: 142,
        totalRatingScore: 681.6
    }
    ```
    (Contains 6 hardcoded demo providers: Rahim Electronics, CoolFix Techs, Karim Plumbing Bros, Dhaka Pipe Masters, Spark Electricals, Spotless Home Care).
  - Booking shape:
    ```javascript
    {
        id: "ORD-" + Math.floor(100000 + Math.random() * 900000),
        customerId, customerName, customerLocation,
        providerId, providerName, serviceCategory,
        price, status: "Requested", isReviewed: false,
        createdAt: new Date().toISOString()
    }
    ```
- **Network Calls (`fetch()` / `XMLHttpRequest`):** NONE. Zero HTTP network requests.
- **Event Listeners:** `DOMContentLoaded` -> calls `MockDB.init()`.
- **Duplicated Logic:**
  - Multiple profile updating helpers (`updateProviderProfile`, `updateProvider`, `updateProviderDetails`) performing overlapping mutations.
  - Direct `localStorage` reads and writes duplicated between `db.js` and other scripts.
- **Global State Variables / Leaks:**
  - Exposes `const MockDB` globally on `window`.

#### 2. `global.js`
- **File Path:** `global.js`
- **Approx Line Count:** 342 lines (14,195 bytes)
- **What it does:** Handles preloader dismiss animation; dark mode persistence via `localStorage.theme`; dynamic navbar dropdown generation; category icon styling; rendering public marketplace cards; hero search keyword filter; service card click handlers; direct booking modal opening and form submission.
- **Hardcoded Data Shapes:**
  - Category icon/color mapping dictionary:
    ```javascript
    var icons = {
        "AC & Appliance": { icon: "fa-snowflake", color: "#4a90e2", bg: "rgba(74, 144, 226, 0.1)" },
        "Plumbing": { icon: "fa-faucet-drip", color: "#10b981", bg: "rgba(16, 185, 129, 0.1)" },
        "Electrical": { icon: "fa-bolt", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
        "Cleaning": { icon: "fa-spray-can-sparkles", color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.1)" },
        "Carpentry": { icon: "fa-hammer", color: "#f97316", bg: "rgba(249, 115, 22, 0.1)" },
        "Painting": { icon: "fa-paintbrush", color: "#ec4899", bg: "rgba(236, 72, 153, 0.1)" },
        "Gardening": { icon: "fa-seedling", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
        "Security": { icon: "fa-shield-halved", color: "#ef4444", bg: "rgba(239, 68, 68, 0.1)" },
        "IT & Networking": { icon: "fa-network-wired", color: "#6366f1", bg: "rgba(99, 102, 241, 0.1)" },
        "Other": { icon: "fa-tools", color: "#6b7280", bg: "rgba(107, 114, 128, 0.1)" }
    };
    ```
- **Network Calls (`fetch()` / `XMLHttpRequest`):** NONE.
- **Event Listeners:**
  - `DOMContentLoaded`
  - `#theme-toggle` click
  - `#global-logout` click
  - `#search-btn` click & `#hero-search` enter key
  - `.category-trigger` cards click
  - `#close-booking` click & modal backdrop click
  - `#direct-booking-form` submit
- **Duplicated Logic:**
  - Direct booking creation logic is separate and slightly divergent from the customer dashboard booking logic in `customer.js`.
- **Global State Variables / Leaks:**
  - Attaches `window.initiateBooking` globally.

#### 3. `auth.js`
- **File Path:** `auth.js`
- **Approx Line Count:** 209 lines (7,849 bytes)
- **What it does:** Controls authentication modal dialog; switches between Login and Sign Up tabs; shows/hides provider service category selector based on role radio; validates input length and regex; registers user in `MockDB`; verifies credentials; stores `currentUser` in `localStorage`; simulates network delay with a 1-second timeout; redirects to appropriate dashboard.
- **Hardcoded Data Shapes:**
  - User profile object shape:
    ```javascript
    {
        id: 'user_' + Math.random().toString(36).substr(2, 9),
        name: name,
        email: email,
        password: password, // Plain text!
        role: role,
        avatar: 'https://ui-avatars.com/api/?name=' + encodeURIComponent(name) + '&background=0052CC&color=fff',
        providerCategory: providerCategory,
        category: providerCategory
    }
    ```
- **Network Calls (`fetch()` / `XMLHttpRequest`):** NONE.
- **Event Listeners:**
  - `DOMContentLoaded`
  - Role radio `change`
  - `.auth-trigger` click
  - `#close-auth` click & modal backdrop click
  - `.auth-tab` click
  - `#signup-form` submit
  - `#login-form` submit
- **Duplicated Logic:**
  - Redirect logic (`redirectBasedOnRole`) duplicated across auth handlers.
- **Global State Variables / Leaks:** None on `window`, but writes sensitive unhashed passwords to `localStorage`.

#### 4. `customer.js`
- **File Path:** `customer.js`
- **Approx Line Count:** 378 lines (15,800 bytes)
- **What it does:** Customer authentication guard; sidebar section tab switching; manages booking request flow (shows 1.5s simulated matchmaking spinner, executes `MockDB.findMatch()`, displays matched provider card); confirms or cancels bookings; renders booking history cards with dynamic 5-stage progress steppers ("Requested", "Accepted", "On the Way", "In Progress", "Completed"); customer profile update form; review modal rating with 5-star interactive hover/click system.
- **Hardcoded Data Shapes:**
  - Lifecycle stages: `["Requested", "Accepted", "On the Way", "In Progress", "Completed"]`.
- **Network Calls (`fetch()` / `XMLHttpRequest`):** NONE.
- **Event Listeners:**
  - `DOMContentLoaded`
  - Sidebar menu tab click
  - `#logout-btn` click
  - `#booking-form` submit
  - `#confirm-booking-btn` click
  - `#cancel-booking-btn` click
  - `#profile-form` submit
  - `#close-review` click & modal backdrop click
  - `.star-btn` mouseover, mouseleave, click
  - `#review-form` submit
- **Duplicated Logic:**
  - Sidebar tab navigation logic is identical to `provider.js` and `admin.js`.
  - Logout routine duplicated in every script.
- **Global State Variables / Leaks:**
  - Attaches `window.openReviewModal` to `window`.

#### 5. `provider.js`
- **File Path:** `provider.js`
- **Approx Line Count:** 574 lines (25,352 bytes) — **EXCEEDS 500 LINES**
- **What it does:** Provider role guard; loads profile and service configurations; handles preset pricing buttons; tab navigation; queries provider-specific bookings; renders incoming job requests with notification counter badge; renders active jobs with status update dropdown and mock map pin; renders completed jobs; handles accepting/rejecting jobs; reads image file upload via `FileReader` converting to Base64 data URL and storing directly in `localStorage`; saves profile and pricing parameters.
- **Hardcoded Data Shapes:**
  - Hardcoded missing asset reference: `DEFAULT_AVATAR = "assets/images/default-avatar.png"`.
  - Price preset values: `[300, 500, 800, 1000, 1500, 2000]`.
- **Network Calls (`fetch()` / `XMLHttpRequest`):** NONE.
- **Event Listeners:**
  - `DOMContentLoaded`
  - `.price-preset` click
  - Sidebar menu tab click
  - `#logout-btn` click
  - `#upload-avatar` change
  - `#provider-profile-form` submit
  - `#service-settings-form` submit
  - `#service-charge` input
- **Duplicated Logic:**
  - Bypasses `MockDB` in several places by directly parsing and modifying `localStorage.getItem("hf_providers")` and `localStorage.getItem("hf_bookings")`.
  - Uploading large Base64 images directly into `localStorage` triggers browser quota errors (`QuotaExceededError`).
- **Global State Variables / Leaks:**
  - Attaches `window.acceptJob`, `window.rejectJob`, and `window.changeStatus` to `window`.

#### 6. `admin.js`
- **File Path:** `admin.js`
- **Approx Line Count:** 140 lines (6,300 bytes)
- **What it does:** Admin role guard; sidebar tab switching; queries `hf_bookings`, `hf_providers`, and `hf_users` from `localStorage`; calculates aggregate platform revenue and count metrics; populates Master Ledger table, Marketplace Providers table, and Registered Users table.
- **Hardcoded Data Shapes:** Reads raw records from `localStorage`.
- **Network Calls (`fetch()` / `XMLHttpRequest`):** NONE.
- **Event Listeners:** `DOMContentLoaded`, sidebar tab click, `#logout-btn` click.
- **Duplicated Logic:** Directly parses `localStorage` instead of using centralized data accessors.
- **Global State Variables / Leaks:** None on `window`.

---

### D. CSS Files Audit

#### 1. `global.css`
- **File Path:** `global.css`
- **Approx Line Count:** 997 lines (14,429 bytes) — **EXCEEDS 500 LINES**
- **CSS Variables / Design Tokens:**
  - Light mode:
    - `--deep-blue: #003366`
    - `--navy-blue: #1a365d`
    - `--royal-blue: #0052cc`
    - `--sky-blue: #4a90e2`
    - `--gradient-primary: linear-gradient(135deg, var(--royal-blue) 0%, var(--sky-blue) 100%)`
    - `--bg-color: #f4f7f6`
    - `--surface-color: #ffffff`
    - `--text-primary: #111827`
    - `--text-secondary: #4b5563`
    - `--border-color: #e5e7eb`
    - `--transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1)`
    - `--shadow-sm: 0 4px 6px -1px rgba(0, 51, 102, 0.05)`
    - `--shadow-md: 0 10px 25px -5px rgba(0, 51, 102, 0.1)`
    - `--shadow-hover: 0 20px 40px -10px rgba(0, 82, 204, 0.2)`
  - Dark mode (`[data-theme="dark"]`):
    - `--bg-color: #0b1120`
    - `--surface-color: #1e293b`
    - `--text-primary: #f9fafb`
    - `--text-secondary: #9ca3af`
    - `--border-color: #334155`
    - `--shadow-hover: 0 20px 40px -10px rgba(74, 144, 226, 0.15)`
- **Framework:** 100% Custom CSS. Does NOT use Bootstrap 5.
- **Color Palette & Typography:**
  - Deep Blue, Royal Blue, Sky Blue, Slate Gray, Neutral Dark.
  - Typography: `'Inter', sans-serif` (weights 300, 400, 500, 600, 700).
- **Spacing Scale:** Unstandardized pixel and rem values (`8px`, `12px`, `14px`, `16px`, `24px`, `32px`, `40px`).
- **Responsive Breakpoints:**
  - `@media (max-width: 600px)`: Collapses navbar links and adjusts hero padding.
- **Obvious Issues:**
  - 997 lines long due to expanded vertical formatting (one CSS rule per line).
  - Lacks proper mobile-first breakpoint scale (e.g. 320px, 576px, 768px, 992px, 1200px).
  - No Bootstrap integration.

#### 2. `auth.css`
- **File Path:** `auth.css`
- **Approx Line Count:** 305 lines (6,930 bytes)
- **CSS Variables / Design Tokens:** Inherits variables from `global.css`.
- **Framework:** Custom modal, tab, and form styling.
- **Responsive Breakpoints:** `@media (max-width: 480px)` (reduces modal padding).
- **Issues:** Hardcoded modal dimensions and animations that can cause mobile overflow on 320px screens.

#### 3. `customer.css`
- **File Path:** `customer.css`
- **Approx Line Count:** 209 lines (5,377 bytes)
- **Framework:** Custom dashboard sidebar, cards, and stepper.
- **Responsive Breakpoints:**
  - `@media (max-width: 768px)`: Changes `.dashboard-layout` from 260px sidebar grid to single column `1fr`.
  - `@media (max-width: 600px)`: Collapses `.form-row` to 1 column.
- **Issues:** Horizontal timeline stepper (`.timeline`, `.timeline-step`) overflows on narrow mobile viewports.

#### 4. `provider.css`
- **File Path:** `provider.css`
- **Approx Line Count:** 173 lines (4,249 bytes)
- **Framework:** Custom provider dashboard components.
- **Responsive Breakpoints:**
  - `@media (max-width: 768px)`: Sets `#current-service-info` to 1 column.
- **Issues:** Uses `!important` on responsive rules (`grid-template-columns: 1fr !important`).

#### 5. `admin.css`
- **File Path:** `admin.css`
- **Approx Line Count:** 92 lines (2,318 bytes)
- **Framework:** Custom admin stats grid and table styling.
- **Responsive Breakpoints:**
  - `@media (max-width: 768px)`: Collapses stats grid to 1 column.
- **Issues:** Table relies on basic horizontal overflow without card-based mobile presentation.

---

### E. Assets

- **Images Present:**
  - `images/logo.jpg`: 49,917 bytes (~48.7 KB) — HutFix official brand logo.
- **Missing Assets Referenced in Code:**
  - `assets/images/default-avatar.png` (referenced in `provider.js:43` and `admin.js:18`, but the `assets/` folder does not exist).
- **Icons & Fonts:**
  - No local font or icon files; loaded via Google Fonts CDN (`Inter`) and Cloudflare CDN (`FontAwesome 6.4.0`).

---

## 2. Feature Inventory vs. Problem Statement

### Official 8 Service Categories Check

The hackathon problem statement requires **8 specific service categories**:
1. Appliance & Gadget Repair
2. Plumbing
3. Electrical
4. Cleaning & Pest Control
5. Home Maintenance
6. Moving & Shifting
7. Car Care & Repair
8. Personal Care

**Existing Prototype Categories:**
- `AC & Appliance` (partially covers #1 Appliance & Gadget Repair)
- `Plumbing` (covers #2 Plumbing)
- `Electrical` (covers #3 Electrical)
- `Cleaning` (partially covers #4 Cleaning & Pest Control)
- `Carpentry` (sub-part of #5 Home Maintenance)
- `Painting` (sub-part of #5 Home Maintenance)
- `Gardening` (sub-part of #5 Home Maintenance)
- `Security` (not in the official 8)
- `IT & Networking` (not in the official 8)
- `Other` (generic catch-all)

**Missing Official Categories:**
- ❌ **Moving & Shifting** (completely missing)
- ❌ **Car Care & Repair** (completely missing)
- ❌ **Personal Care** (completely missing)
- ⚠️ **Home Maintenance** (fragmented into Carpentry/Painting/Gardening instead of unified category)
- ⚠️ **Appliance & Gadget Repair** (labeled only as "AC & Appliance")
- ⚠️ **Cleaning & Pest Control** (labeled only as "Cleaning")

---

### Feature Matrix

| Requirement | Status | Evidence (file:line-ish) | Gap |
|---|---|---|---|
| **1. Service Selection (8 categories)** | ⚠️ partial | `index.html:78-172`, `customer.html:64-76`, `provider.html:130-140`, `global.js:47-58`, `db.js:22-100` | Prototype has 9 non-standard categories. Missing "Moving & Shifting", "Car Care & Repair", and "Personal Care". Hardcoded across 5 distinct files instead of driven by database table. |
| **2. Service Request form** (type, location, date/time, urgency, details, optional image, contact) | ⚠️ partial | `customer.html:60-110`, `customer.js:75-130`, `index.html:196-335` | Captures type, location, date, time, urgency, details. **MISSING optional problem image upload** in request form. **MISSING customer contact phone number field**. Only saves to client `localStorage`. |
| **3. Smart Provider Matching** (multi-factor scoring) | ⚠️ partial | `db.js:321-342` (`findMatch`), `customer.js:90-128` | Naive sorting: filters by category, sorts by rating then jobsCompleted. **Distance is faked** using `Math.random()`. No multi-factor scoring formula (rating, distance, workload, price, availability). No conflict resolution or fallback scoring. |
| **4. Scheduling** (slots, prevent double-booking) | ⚠️ partial / ❌ missing | `customer.html:89-95`, `provider.html:330`, `db.js:324` | Captures raw HTML date and time inputs. **NO discrete time slots** (e.g. 9-11 AM, 11-1 PM). **NO double-booking prevention**: providers can be booked infinitely at the exact same date and time. |
| **5. Request Tracking** (Requested→Accepted→On the Way→In Progress→Completed) | ⚠️ partial | `customer.js:177-202`, `provider.js:275-280`, `provider.js:338-345` | Visual 5-stage UI stepper exists in customer dashboard. Provider can advance statuses via dropdown. However, **NO real-time client-server synchronization**; changes only persist within browser `localStorage`. No stage transition timestamps. |
| **6. Provider Dashboard** (view requests, accept/reject, customer details, scheduled jobs, update status) | ✅ | `provider.html:71-88`, `provider.js:271-375` | Provider can view incoming requests, accept or reject, view customer info, inspect active jobs with mock map pin, and update statuses. Needs migration from `localStorage` to Express REST API. |
| **Bonus: Notifications, Invoice, Rating, Priority, Workload Balance** | ⚠️ partial | `customer.js:268-374` (Review), `customer.html:80-84` (Urgency), `provider.js:282-286` (Badge) | Interactive 5-star rating and urgency priority implemented. **MISSING PDF/printable invoice generation**. **MISSING push/SMS/email notifications**. **MISSING provider workload balancing logic** in matchmaking. |

---

## 3. Reusability Assessment

| File / Artifact | Classification | 1-Line Reason |
|---|---|---|
| `images/logo.jpg` | `KEEP` | High-quality brand identity asset; move directly into `client/assets/images/logo.jpg`. |
| `index.html` | `REFACTOR` | Strong landing & catalog UI structure, but needs trailing syntax error fix, moving to `client/`, Bootstrap 5 tokens, and API hookup. |
| `customer.html` | `REFACTOR` | Well-structured customer portal; needs moving to `client/`, adding problem image upload and phone fields, and API integration. |
| `provider.html` | `REFACTOR` | Comprehensive provider management workspace; needs moving to `client/`, fixing missing avatar path, and REST endpoint binding. |
| `admin.html` | `REFACTOR` | Clean operational KPI and ledger interface; needs moving to `client/` and binding to protected `/api/admin` endpoints. |
| `global.css` | `REFACTOR` | Contains rich design tokens and styling; needs splitting into `tokens.css` and `components.css` on top of Bootstrap 5. |
| `auth.css` | `REFACTOR` | Reusable modal and input group styles; consolidate into `client/css/components.css`. |
| `customer.css` | `REFACTOR` | Great 5-stage tracking stepper and layout styles; relocate to `client/css/` and improve 320px mobile responsiveness. |
| `provider.css` | `REFACTOR` | Functional provider UI styling; relocate to `client/css/` and remove `!important` overrides. |
| `admin.css` | `REFACTOR` | Reusable KPI grid and table styling; relocate to `client/css/` with mobile table card enhancements. |
| `global.js` | `REFACTOR` | Good dark mode and UI helper logic; refactor into modular client scripts calling Express catalog and booking APIs. |
| `customer.js` | `REFACTOR` | Excellent UI event wiring, star rating interaction, and 5-stage tracker; replace simulated timeouts with async API calls. |
| `provider.js` | `REFACTOR` | Exceeds 500 lines with high complexity and heavy Base64 storage; split into modular client scripts calling provider endpoints. |
| `admin.js` | `REFACTOR` | Clean DOM population for metrics and tables; refactor to fetch data from authenticated `/api/admin` routes. |
| `.gitignore` | `REFACTOR` | Retain core rules; expand for Node monorepo, environment files, and remove Firebase specifics. |
| `db.js` | `REWRITE` | Throw away client-side `localStorage` mock; replace completely with Express controllers and PostgreSQL schema/queries. |
| `auth.js` | `REWRITE` | Insecure client-side password verification and fake user storage; replace with JWT-based auth client calling `/api/auth`. |
| `404.html` | `DELETE` | Boilerplate Firebase CLI auto-generated file; obsolete for target Node/Express architecture. |
| `firebase.json` | `DELETE` | Legacy Firebase hosting configuration file; obsolete for monorepo target stack. |
| `.firebaserc` | `DELETE` | Firebase project metadata; obsolete for monorepo target stack. |
| `.firebase/` | `DELETE` | Obsolete Firebase hosting local build cache directory. |

### Classification Counts:
- **KEEP:** 1 artifact (`images/logo.jpg`)
- **REFACTOR:** 13 artifacts (`index.html`, `customer.html`, `provider.html`, `admin.html`, `global.css`, `auth.css`, `customer.css`, `provider.css`, `admin.css`, `global.js`, `customer.js`, `provider.js`, `admin.js`, `.gitignore`)
- **REWRITE:** 2 artifacts (`db.js`, `auth.js`)
- **DELETE:** 4 artifacts (`404.html`, `firebase.json`, `.firebaserc`, `.firebase/`)

---

## 4. Risks & Landmines

1. **Security Vulnerability — Plain-Text Passwords in Client State:**
   Existing `auth.js` and `db.js` store unhashed, plain-text passwords directly in `window.localStorage.hf_users`. Anyone inspecting browser storage can extract user credentials. This must be replaced with server-side bcrypt hashing and signed JWT authentication.
2. **Existing `.env` or Credentials File Present:**
   **NO.** No `.env`, `.env.local`, or credentials file exists in the repository.
3. **Large Files Requiring Splitting (> 500 lines):**
   - `global.css`: 997 lines (formatted) / 673 lines (compact) — needs modularization into `tokens.css`, `components.css`, and `pages.css`.
   - `provider.js`: 574 lines (formatted) / 503 lines — handles auth, profiles, service settings, active bookings, status transitions, and Base64 file uploads; must be decomposed.
4. **Global Mutable State Conflicts:**
   Multiple scripts independently read, mutate, and overwrite `window.localStorage` keys (`hf_providers`, `hf_bookings`, `hf_users`, `hf_reviews`, `currentUser`) without any locking, schema validation, or transaction guarantees. Several functions (`initiateBooking`, `openReviewModal`, `acceptJob`, `rejectJob`, `changeStatus`) leak into the global `window` scope.
5. **Missing Build, Dependency, and Documentation Files:**
   - `package.json`: **MISSING** (no npm workspace or dependencies initialized).
   - `README.md`: **MISSING** (no project documentation or setup instructions).
6. **DB Portability Contract Violations & Conflicts:**
   - Current prototype contains zero database code (100% `localStorage`).
   - Landmine to prevent: Data models in `db.js` use loosely structured JSON with nested arrays (e.g. `serviceTypes: ["AC Repair", ...]`). In Phase 1, these must be structured into standard, portable SQL tables compatible with both local PostgreSQL and Supabase.
   - All connection parameters must flow strictly through a single `DATABASE_URL` string in `.env` using standard `pg` (node-postgres). No Supabase-specific extensions or CLI tooling may be introduced.
7. **Code Quality and Functional Landmines:**
   - **Syntax Error in `index.html`:** Line 460 ends with `</html>k` (trailing character `k`).
   - **Missing Asset:** `provider.js:43` references `"assets/images/default-avatar.png"`, which does not exist in the repository.
   - **LocalStorage Quota Exceeded:** `provider.js` converts uploaded avatar images (up to 2MB) into raw Base64 data strings and stores them in `localStorage`, which frequently crashes mobile browsers when exceeding 5MB storage limits.
   - **Double-Booking Vulnerability:** Schedulers do not check existing bookings; multiple customers can book the same provider on the identical date and time slot.
   - **Fake Distance Metric:** Matchmaker generates simulated distances with `Math.random() * 8 + 1`.

---

## 5. Proposed Structure

Proposed production-grade monorepo layout:

```text
/
├── client/
│   ├── index.html                 # Landing page & public service catalog
│   ├── request.html               # Service booking request & matching interface
│   ├── tracking.html              # Customer booking tracking & history
│   ├── provider.html              # Provider operations dashboard
│   ├── admin.html                 # Admin control panel & master ledger
│   ├── login.html                 # Unified authentication screen
│   ├── css/
│   │   ├── tokens.css             # CSS variables, color palette, dark mode tokens
│   │   ├── bootstrap.min.css      # Bootstrap 5 core (or CDN)
│   │   ├── components.css         # Reusable cards, modals, buttons, forms, badges
│   │   └── pages.css              # Page-specific layout overrides
│   ├── js/
│   │   ├── api.js                 # Centralized fetch wrapper & error handler
│   │   ├── auth.js                # JWT token management & role-based route guard
│   │   ├── catalog.js             # Public service browsing & category filter
│   │   ├── request.js             # Service request submission & matching trigger
│   │   ├── tracking.js            # 5-stage lifecycle stepper & live status polling
│   │   ├── provider.js            # Provider dashboard job management & status updates
│   │   └── admin.js               # Admin ledger, KPI metrics & user directory
│   └── assets/
│       └── images/
│           ├── logo.jpg           # HutFix branding logo (migrated from images/)
│           └── default-avatar.png # Fallback profile placeholder
├── server/
│   ├── index.js                   # Express application entrypoint
│   ├── config/
│   │   ├── db.js                  # node-postgres (pg) pool with single DATABASE_URL
│   │   └── env.js                 # Centralized environment variable validation
│   ├── routes/
│   │   ├── auth.routes.js         # Register, login, me endpoints
│   │   ├── services.routes.js     # 8 official service categories & catalog
│   │   ├── bookings.routes.js     # Request creation, status updates, history
│   │   ├── providers.routes.js    # Provider profile, settings, availability
│   │   └── admin.routes.js        # Admin metrics and system ledger
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── services.controller.js
│   │   ├── bookings.controller.js
│   │   ├── providers.controller.js
│   │   └── admin.controller.js
│   ├── services/
│   │   ├── matching.service.js    # Multi-factor scoring engine (category, distance, rating, workload)
│   │   ├── scheduling.service.js  # Slot conflict & double-booking prevention engine
│   │   └── pricing.service.js     # Dynamic service pricing & urgency calculations
│   ├── middleware/
│   │   ├── auth.middleware.js     # Role-based JWT verification (Customer / Provider / Admin)
│   │   ├── validate.middleware.js # Request payload schema validation
│   │   └── error.middleware.js    # Centralized HTTP error handler
│   └── utils/
│       ├── logger.js              # Standardized server logger
│       └── response.js            # Consistent API response envelope
├── database/
│   ├── schema.sql                 # Pure portable PostgreSQL DDL (portable to Supabase)
│   ├── seed.sql                   # Standard SQL seeds (8 official categories, demo users)
│   └── migrations/                # Sequential SQL migration files
├── docs/
│   ├── API.md                     # OpenAPI / REST endpoint documentation
│   └── ARCHITECTURE.md           # System architecture & DB Portability Contract guide
├── .env.example                   # Single DATABASE_URL template for local Postgres and Supabase
├── .gitignore                     # Comprehensive monorepo gitignore
├── package.json                   # Root workspace / scripts
├── README.md                      # Project setup, hackathon problem statement & guide
├── AUDIT.md                       # Complete Phase 0 audit report
└── test_phase0.js                 # Baseline verification test suite
```

---

## 6. DB Portability Contract

The Smart Home Service Automation application must transition from local development PostgreSQL to managed cloud Supabase with **zero application code changes** beyond switching `.env` values.

### Mandatory Portability Rules:
1. **Portable SQL Only:** All DDL in `database/schema.sql` and DML in `database/seed.sql` must strictly adhere to ANSI / portable PostgreSQL standard syntax. No Supabase-specific extensions (e.g. `supabase-js`, Supabase Auth, Row Level Security policies, or `pgvector`) will be utilized.
2. **Single Connection String (`DATABASE_URL`):** The backend database configuration (`server/config/db.js`) must instantiate a `pg.Pool` exclusively using a single connection string:
   - Development format: standard URI string pointing to local host and port.
   - Production format: standard URI string pointing to Supabase cloud connection pooler.
   - No individual host, port, user, or database name parameters will be hardcoded in application logic.
3. **No Secrets in Committed Files:** `.env` is strictly git-ignored. Only `.env.example` will be committed to provide the connection string schema with placeholder credentials.
4. **Standalone SQL Migrations:** All database initialization and migration scripts must execute directly via standard `psql` or Node-based migration tools without requiring the Supabase CLI.

---
*Phase 0 Audit completed in read-only mode.*
