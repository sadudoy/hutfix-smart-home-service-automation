# HutFix — 3-Minute Hackathon Demo Script & Presentation Pitch

> **Project:** HutFix — Automated Home Service Marketplace & Operations Engine  
> **Target Audience:** Hackathon Judges, Technical Evaluators, Industry Mentors  
> **Demo Duration:** 3 Minutes  
> **Live App URL:** http://localhost:3000

---

##  Demo Credentials

All accounts are pre-seeded and active in the local PostgreSQL database:

| Role | Email | Password | Access & Dashboard |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@demo.test` | `demo1234` | Service Discovery, Direct Booking, Saved Addresses, Live SSE Tracking, Invoices |
| **Provider** | `provider@demo.test` | `demo1234` | Repairman Workspace, Job Dispatch, Availability Calendar, Invoicing, Payout Requests |
| **Admin** | `admin@demo.test` | `demo1234` | Executive Dashboard, User/Gig Moderation, bKash Payment Auditing, Payout Approvals |

*(Quick switch pills are also available directly on the login modal for instant 1-click credential autofill).*

---

## ⏱️ Minute-by-Minute Presentation Pitch

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ MINUTE 1: CUSTOMER DISCOVERY & DIRECT BOOKING                                              │
│ "Instant specialist discovery with local Dhaka area matching & upfront bKash checkout."    │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ MINUTE 2: ADMIN VERIFICATION & PROVIDER DISPATCH                                            │
│ "Fraud-free mobile banking verification & zero-double-booking advisory lock dispatch."      │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│ MINUTE 3: REAL-TIME SSE TRACKING & AUTOMATED FINANCIAL SETTLEMENT                          │
│ "Live milestone updates without polling, tamper-proof invoices, and specialist payouts."    │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Minute 1: The Customer Experience (Discovery, Direct Booking & bKash)

1. **Sign In as Customer:**
   - Click **Sign in** in the top navigation bar. Click the quick-fill pill **"Customer"** (`customer@demo.test`) and sign in.
   - Show the personalized welcome banner, Dhaka area selector (`Dhanmondi, Dhaka`), and verified category cards.
2. **Explore Specialist Gigs:**
   - Scroll to the **"Browse by category"** section and select **"Appliance"**.
   - Show filter controls: filter by minimum rating (4.8+), price cap, or sorting.
   - Click on the top card (**"Rahim Electronics & AC Care"**) to navigate to their **Gig Details** page.
3. **Inspect Pro Credentials & Reviews:**
   - Highlight the specialist's profile: Verified Badge, 9+ years experience, star breakdown, and verified client reviews.
4. **Direct Specialist Booking with Concurrency Lock:**
   - Click **"Book this Pro ↗"**.
   - Note the seamless time slot picker. The system dynamically queries available 1-hour slots from `provider_availability` minus existing bookings.
   - Select an address from the **Saved Address Book** (e.g. *House 18, Road 7, Dhanmondi, Dhaka*).
   - Select a preferred service slot.
5. **Mobile Banking Checkout (bKash / Nagad):**
   - Click **"Proceed to Payment ↗"**.
   - Display the transparent fee breakdown: Specialist Base Rate + 5% Platform & VAT.
   - Show the authentic payment instructions: Merchant Number `01712345678`.
   - Enter payment details:
     - Method: **bKash**
     - Transaction ID: `TRX782910`
     - Sender Number: `01711223344`
   - Click **"Submit Payment Proof ↗"**.
   - The appointment is instantly locked into the database under `requested` status with `payment_status: 'pending'`.

---

### Minute 2: Admin Verification & Provider Dispatch

1. **Switch to Admin Workspace:**
   - Click **Log out**, then sign in as **Admin** (`admin@demo.test`).
   - The sidebar switches to the executive administrative workspace.
2. **Review Finance -> Payment Verifications:**
   - Navigate to **"Payments"** in the sidebar.
   - Show the pending payment queue: see the newly submitted `TRX782910` with customer contact and amount.
   - Click **"Verify"**.
   - **Key Sync Feature:** The UI instantly executes `await loadAdminData(); render();` — the verified item dynamically vanishes from the pending queue, and a confirmation toast appears.
3. **Switch to Specialist Workspace:**
   - Log out and sign in as **Provider** (`provider@demo.test`).
   - The dashboard opens into the **Repairman Workspace**: showing total earnings in BDT, active jobs, new incoming requests, and rating statistics.
4. **Accept & Dispatch the Job:**
   - Click **"Requests"** in the sidebar.
   - View the client's verified booking request with appointment time, address, and issue description.
   - Click **"Accept Request ↗"**.
   - Click **"Mark On the Way ↗"**.

---

### Minute 3: The "Wow" Factor (SSE Tracking, Invoices & Payouts)

1. **Real-Time Tracking (Server-Sent Events):**
   - Log back in as **Customer** (`customer@demo.test`) and navigate to **"Bookings"** -> click **"Live Tracking"** on the active appointment.
   - Point out the live connection: **Server-Sent Events (SSE)** via `GET /api/requests/:id/stream`.
   - As the provider moves the job status (`on_the_way` -> `in_progress` -> `completed`), the customer's stepper updates in real-time without refreshing or polling.
2. **Automated Final Invoicing:**
   - When the specialist marks the job as **"Completed"**, the lifecycle engine automatically issues an immutable record in `invoices`.
   - Click **"View Invoice ↗"** on the completed booking.
   - Display the complete itemized tax invoice: Customer Details, Provider Registration, Subtotal, 5% Platform Fee, and Paid in Full stamp.
3. **Financial Settlements & Payout Approval:**
   - Switch back to Admin (`admin@demo.test`).
   - Navigate to **"Payouts"**.
   - Show pending withdrawal requests submitted by specialists (e.g. ৳4,500 withdrawal to bKash).
   - Click **"Approve"**.
   - Payout updates to `completed`, deducting from pending liability and refreshing the Admin table in real time.

---

##  Key Architectural & Engineering Highlights (For Judges)

1. **Advisory Transaction Locks (Zero Double-Booking Guarantee):**
   - We utilize PostgreSQL transaction-level advisory locks via `pg_advisory_xact_lock(hashtext('provider_' || provider_id || '_' || slot_date || '_' || slot_minute))`.
   - Even under heavy concurrent requests, conflicting bookings are serialized at the database engine level. Conflicting clients receive smart alternative slot recommendations within milliseconds.
2. **Native Server-Sent Events (SSE):**
   - Real-time customer tracking is powered by an SSE event bus (`server/services/sse.service.js`) with automatic connection cleanup and keep-alive heartbeats, requiring zero third-party socket dependencies.
3. **Manual Mobile Banking Reconciliation:**
   - Built specifically for the local Bangladeshi financial ecosystem, supporting manual bKash and Nagad Merchant TrxID verification workflows with instant admin synchronization.
4. **Strict Role-Based Access Control (RBAC):**
   - Enforced both at the Express middleware layer (`requireAuth`, `requireRole('admin', 'provider', 'customer')`) and database schema layer, isolating client, specialist, and administrator capabilities completely.
5. **Modern Semantic UI & WCAG Accessibility:**
   - Built using a high-performance vanilla SPA architecture with Manrope typography, zero layout shifts, full keyboard navigation, ARIA labeling, and persistent light/dark mode switching.
