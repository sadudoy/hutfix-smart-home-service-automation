# HutFix — 5-Minute Evaluation & Demo Walkthrough

Welcome to the **HutFix** hackathon demo script. Follow this 5-minute interactive walkthrough to evaluate the entire end-to-end lifecycle.

---

## Demo Credentials Table

| Role | Email | Password | Pre-seeded Details |
| :--- | :--- | :--- | :--- |
| **Customer** | `customer@demo.test` | `demo1234` | Demo Customer, Dhanmondi, Dhaka |
| **Provider** | `provider@demo.test` | `demo1234` | Rahim Electronics & AC Care (Provider #1) |
| **Admin** | `admin@demo.test` | `demo1234` | Platform Administrator |

---

## Step-by-Step Walkthrough

### Step 1: Customer Booking & Smart Matching
1. Open `http://localhost:5000/login.html` in your browser.
2. Click the **"Fill Customer"** demo button, then click **"Sign In"**.
3. You will be redirected to the customer portal. Click **"New Request"** (or visit `http://localhost:5000/request.html`).
4. Select category **"Appliance & Gadget Repair"**, enter address `"Dhanmondi 32, Dhaka"`, and choose an upcoming Saturday date with time window `10:00 - 11:00`.
5. Click **"Find Matching Specialists"**:
   - The matching engine ranks available specialists using distance, rating, price, and workload capping.
   - Choose the top-ranked specialist (**Rahim Electronics & AC Care**).
6. Select an available time slot and click **"Confirm Booking"**.
7. You are redirected to `http://localhost:5000/tracking.html` with your new request in `Requested` status.

---

### Step 2: Provider Acceptance & Status Progression
1. Open an incognito browser window or log out and log in at `http://localhost:5000/login.html`.
2. Click **"Fill Provider"** (`provider@demo.test` / `demo1234`) and sign in.
3. You land on the Provider Dashboard at `http://localhost:5000/provider.html`.
4. In the **Incoming** tab, notice the new service card:
   - If marked urgent, it displays a red pulsing pill: `"URGENT — respond within 15 min"`.
5. Click **"Accept Job"**:
   - The request moves from **Incoming** to **Active Tasks**.
6. Switch to the **Active Tasks** tab:
   - Click **"Mark On The Way &rarr;"** &rarr; status updates to `on_the_way`.
   - Click **"Start Job &rarr;"** &rarr; status updates to `in_progress`.
   - Click **"Complete Service &rarr;"** &rarr; status updates to `completed`.
   - Behind the scenes, the platform generates the official financial invoice in `invoices` and issues live notification alerts.

---

### Step 3: Customer Invoice Inspection & 5-Star Rating
1. Return to the Customer session at `http://localhost:5000/tracking.html`.
2. Select your completed request:
   - The 5-stage stepper shows all 5 milestones completed with emerald checkmarks.
3. Notice the **"View invoice"** button:
   - Click it to view the generated printable invoice at `http://localhost:5000/invoice.html?id=<requestId>`.
   - Verify the 5% platform tax calculation and click **"Download / Print"**.
4. Return to `http://localhost:5000/tracking.html` and click **"Rate this service"**:
   - The modal opens: choose 5 stars, enter a review comment (e.g., *"Prompt service and excellent repair!"*), and submit.
   - The card dynamically updates to display: *"You rated this ⭐ 5.0 — 'Prompt service and excellent repair!'"*.

---

### Step 4: Real-Time Notifications Bell
1. Click the notification bell icon (`#notif-bell`) in the top navigation bar of either the Customer or Provider portal.
2. Observe the chronological event feed:
   - Customer notifications: `"Your request was accepted"`, `"Job completed"`, `"Invoice issued"`.
   - Provider notifications: `"New Appliance & Gadget Repair request"`, `"New review"`.
3. Click an unread notification to mark it read, or click **"Mark all read"** to clear unread counts.
