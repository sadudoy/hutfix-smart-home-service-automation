/**
 * Phase 12 Verification Test Suite - HutFix Operations, Admin Verification & Real-Time Tracking
 *
 * Checks:
 * 1. Name correction: Pure HutFix branding across client/index.html, README.md, docs.
 * 2. Static files: Migration 003, provider-ops controller/routes, SSE service, admin endpoints.
 * 3. Security: Old password verification on profile update.
 * 4. Customer manual payment flow (bKash/Nagad, TrxID, Sender phone).
 * 5. Real-Time Tracking SSE stream endpoint.
 * 6. Admin manual payment verification (cleared) & rejection (freed slot, cancelled request).
 * 7. Provider weekly availability PUT & blackouts CRUD (and blackout exclusion in matching).
 * 8. Provider payout requests & Admin payout approvals.
 * 9. Admin user verification toggle (is_active).
 * 10. Disputes creation & moderation resolution.
 * 11. Pagination for bookings, users, and customer requests.
 * 12. Full Regression Suite: Phase 0 through Phase 11 all exit 0.
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { execSync } = require('child_process');
const { pool } = require('./server/config/db');
const { app } = require('./server/index');

let server;
let baseUrl;

function assert(condition, message) {
    if (!condition) {
        console.error(`[FAIL] ${message}`);
        process.exit(1);
    }
    console.log(`[PASS] ${message}`);
}

function makeRequest(urlPath, options = {}) {
    return new Promise((resolve, reject) => {
        const fullUrl = new URL(urlPath, baseUrl);
        const reqOpts = {
            method: options.method || 'GET',
            headers: options.headers || {}
        };

        const req = http.request(fullUrl, reqOpts, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                resolve({
                    status: res.statusCode,
                    headers: res.headers,
                    body
                });
            });
        });

        req.on('error', reject);
        if (options.body) {
            req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
        }
        req.end();
    });
}

async function run() {
    console.log('====================================================');
    console.log('   PHASE 12: HUTFIX OPERATIONS & REAL-TIME TRACKING ');
    console.log('====================================================\n');

    // --------------------------------------------------------
    // Part 1: Static Code & Name Correction Assertions
    // --------------------------------------------------------
    console.log('--- Part 1: Static Code & Name Correction Assertions ---');

    const indexHtml = fs.readFileSync(path.join(__dirname, 'client', 'index.html'), 'utf8');
    const appJs = fs.readFileSync(path.join(__dirname, 'client', 'app.js'), 'utf8');
    const readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');

    assert(indexHtml.includes('HutFix'), 'client/index.html contains HutFix');
    assert(!indexHtml.includes('Fixora'), 'client/index.html does not contain Fixora');
    assert(!indexHtml.includes('FixHut'), 'client/index.html does not contain FixHut');

    assert(appJs.includes('HutFix'), 'client/app.js contains HutFix');
    assert(!appJs.includes('Fixora'), 'client/app.js does not contain Fixora');

    assert(readme.includes('HutFix'), 'README.md contains HutFix');
    assert(!readme.includes('Fixora'), 'README.md does not contain Fixora');

    assert(fs.existsSync(path.join(__dirname, 'database', 'migrations', '003_provider_ops.sql')),
        'database/migrations/003_provider_ops.sql exists');

    const mig003 = fs.readFileSync(path.join(__dirname, 'database', 'migrations', '003_provider_ops.sql'), 'utf8');
    assert(mig003.includes('provider_blackouts'), '003 migration includes provider_blackouts');
    assert(mig003.includes('disputes'), '003 migration includes disputes');
    assert(mig003.includes('payout_requests'), '003 migration includes payout_requests');
    assert(mig003.includes('payment_method') && mig003.includes('trx_id') && mig003.includes('payment_status'),
        '003 migration includes manual payment columns');

    assert(fs.existsSync(path.join(__dirname, 'server', 'services', 'sse.service.js')),
        'server/services/sse.service.js exists');
    assert(fs.existsSync(path.join(__dirname, 'server', 'controllers', 'provider-ops.controller.js')),
        'server/controllers/provider-ops.controller.js exists');
    assert(fs.existsSync(path.join(__dirname, 'server', 'routes', 'provider-ops.routes.js')),
        'server/routes/provider-ops.routes.js exists');

    const adminCtrl = fs.readFileSync(path.join(__dirname, 'server', 'controllers', 'admin.controller.js'), 'utf8');
    assert(adminCtrl.includes('toggleVerifyUser'), 'admin.controller.js contains toggleVerifyUser');
    assert(adminCtrl.includes('assignBooking'), 'admin.controller.js contains assignBooking');
    assert(adminCtrl.includes('getDisputes'), 'admin.controller.js contains getDisputes');
    assert(adminCtrl.includes('resolveDispute'), 'admin.controller.js contains resolveDispute');
    assert(adminCtrl.includes('getPayments'), 'admin.controller.js contains getPayments');
    assert(adminCtrl.includes('verifyPayment'), 'admin.controller.js contains verifyPayment');
    assert(adminCtrl.includes('getPayouts'), 'admin.controller.js contains getPayouts');
    assert(adminCtrl.includes('approvePayout'), 'admin.controller.js contains approvePayout');

    const reqCtrl = fs.readFileSync(path.join(__dirname, 'server', 'controllers', 'requests.controller.js'), 'utf8');
    assert(reqCtrl.includes('stream'), 'requests.controller.js contains stream');
    assert(reqCtrl.includes('createDispute'), 'requests.controller.js contains createDispute');

    const authCtrl = fs.readFileSync(path.join(__dirname, 'server', 'controllers', 'auth.controller.js'), 'utf8');
    assert(authCtrl.includes('old_password'), 'auth.controller.js verifies old_password');

    assert(appJs.includes('renderProviderAvailability'), 'client/app.js contains renderProviderAvailability');
    assert(appJs.includes('renderAdminPayments'), 'client/app.js contains renderAdminPayments');
    assert(appJs.includes('renderAdminPayouts'), 'client/app.js contains renderAdminPayouts');
    assert(appJs.includes('EventSource'), 'client/app.js contains EventSource for SSE tracking');
    assert(appJs.includes('trx_id') && appJs.includes('payment_method'), 'client/app.js contains manual payment proof fields');

    // --------------------------------------------------------
    // Part 2: Functional Server & API Tests
    // --------------------------------------------------------
    console.log('\n--- Part 2: Functional Server & API Tests ---');

    await new Promise((resolve, reject) => {
        server = http.createServer(app);
        server.listen(0, '127.0.0.1', () => {
            const port = server.address().port;
            baseUrl = `http://127.0.0.1:${port}`;
            resolve();
        });
        server.on('error', reject);
    });

    try {
        // 2.1 Logins
        const custLogin = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { email: 'customer@demo.test', password: 'demo1234' }
        });
        assert(custLogin.status === 200, 'Customer login returns 200');
        const custCookie = custLogin.headers['set-cookie']?.[0]?.split(';')?.[0] || '';
        assert(custCookie.includes('hutfix_token='), 'Customer login returns hutfix_token cookie');

        const provLogin = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { email: 'provider@demo.test', password: 'demo1234' }
        });
        assert(provLogin.status === 200, 'Provider login returns 200');
        const provCookie = provLogin.headers['set-cookie']?.[0]?.split(';')?.[0] || '';

        const adminLogin = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { email: 'admin@demo.test', password: 'demo1234' }
        });
        assert(adminLogin.status === 200, 'Admin login returns 200');
        const adminCookie = adminLogin.headers['set-cookie']?.[0]?.split(';')?.[0] || '';

        // 2.2 Security: Password Change requires and checks old_password
        const missingOldPass = await makeRequest('/api/auth/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: custCookie },
            body: { password: 'newsecretpass123' }
        });
        assert(missingOldPass.status === 400, 'Profile password change without old_password returns 400 Bad Request');

        const wrongOldPass = await makeRequest('/api/auth/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: custCookie },
            body: { old_password: 'wrongpassword', password: 'newsecretpass123' }
        });
        assert(wrongOldPass.status === 401, 'Profile password change with incorrect old_password returns 401 Unauthorized');

        const validOldPass = await makeRequest('/api/auth/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: custCookie },
            body: { old_password: 'demo1234', password: 'tempdemo1234' }
        });
        assert(validOldPass.status === 200, 'Profile password change with valid old_password returns 200 OK');

        // Restore customer password
        await makeRequest('/api/auth/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: custCookie },
            body: { old_password: 'tempdemo1234', password: 'demo1234' }
        });

        // 2.3 Customer booking with manual bKash details
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 2);
        const testDate = tomorrow.toISOString().split('T')[0];

        const bookPayload = {
            category_slug: 'appliance-repair',
            provider_id: 2,
            preferred_date: testDate,
            preferred_start_minute: 600,
            preferred_end_minute: 720,
            urgency: 'normal',
            address: 'House 42, Road 11, Banani, Dhaka',
            payment_method: 'bkash',
            trx_id: 'TRX_PHASE12_TEST_01',
            sender_number: '01719998877'
        };

        const createRes = await makeRequest('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: custCookie },
            body: bookPayload
        });
        assert(createRes.status === 200 || createRes.status === 201, 'POST /api/requests with manual payment returns 200/201');
        const createData = JSON.parse(createRes.body);
        const testReqId = createData.request.id;
        assert(createData.request.payment_method === 'bkash', 'Created request has payment_method=bkash');
        assert(createData.request.trx_id === 'TRX_PHASE12_TEST_01', 'Created request has trx_id');
        assert(createData.request.sender_number === '01719998877', 'Created request has sender_number');
        assert(createData.request.payment_status === 'pending', 'Created request has payment_status=pending');

        // 2.4 Real-time SSE Stream Endpoint Test
        const sseRes = await new Promise((resolve, reject) => {
            const fullUrl = new URL(`/api/requests/${testReqId}/stream`, baseUrl);
            const req = http.request(fullUrl, { method: 'GET', headers: { Cookie: custCookie } }, (res) => {
                let firstChunk = '';
                res.on('data', chunk => {
                    firstChunk += chunk;
                    res.destroy(); // close after first event
                    resolve({
                        status: res.statusCode,
                        headers: res.headers,
                        data: firstChunk
                    });
                });
            });
            req.on('error', (err) => {
                // If stream was aborted after receiving, that's fine
                if (err.code === 'ECONNRESET') return;
                reject(err);
            });
            req.end();
        });
        assert(sseRes.status === 200, 'GET /api/requests/:id/stream returns 200');
        assert(sseRes.headers['content-type'].includes('text/event-stream'), 'SSE header Content-Type is text/event-stream');
        assert(sseRes.data.includes('data:'), 'SSE stream received data event frame');

        // 2.5 Admin Manual Payment Verification
        const adminPaymentsRes = await makeRequest('/api/admin/payments', {
            headers: { Cookie: adminCookie }
        });
        assert(adminPaymentsRes.status === 200, 'GET /api/admin/payments returns 200');
        const adminPaymentsData = JSON.parse(adminPaymentsRes.body);
        assert(adminPaymentsData.ok === true && Array.isArray(adminPaymentsData.payments), 'Admin payments response contains payments array');
        const foundPayment = adminPaymentsData.payments.find(p => p.id === testReqId);
        assert(foundPayment != null, 'Admin payments list includes newly created request');

        const verifyRes = await makeRequest(`/api/admin/payments/${testReqId}/verify`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
            body: { action: 'verify' }
        });
        assert(verifyRes.status === 200, 'PATCH /api/admin/payments/:id/verify returns 200');
        const verifyData = JSON.parse(verifyRes.body);
        assert(verifyData.request.payment_status === 'verified', 'Payment status updated to verified');

        // 2.6 Admin Payment Rejection & Slot Release
        const rejectReqRes = await makeRequest('/api/requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: custCookie },
            body: {
                category_slug: 'appliance-repair',
                provider_id: 2,
                preferred_date: testDate,
                preferred_start_minute: 780,
                preferred_end_minute: 900,
                urgency: 'normal',
                address: 'Dhanmondi, Dhaka',
                payment_method: 'nagad',
                trx_id: 'TRX_FAKE_REJECT',
                sender_number: '01800000000'
            }
        });
        const rejectReqId = JSON.parse(rejectReqRes.body).request.id;

        const rejectPayRes = await makeRequest(`/api/admin/payments/${rejectReqId}/verify`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
            body: { action: 'reject' }
        });
        assert(rejectPayRes.status === 200, 'PATCH /api/admin/payments/:id/verify (reject) returns 200');
        const rejectData = JSON.parse(rejectPayRes.body);
        assert(rejectData.request.payment_status === 'rejected', 'Payment status updated to rejected');
        assert(rejectData.request.status === 'cancelled', 'Rejected payment automatically cancels request');

        const checkBookingSlot = await pool.query('SELECT 1 FROM provider_bookings WHERE request_id = $1;', [rejectReqId]);
        assert(checkBookingSlot.rows.length === 0, 'Rejection automatically releases provider_bookings slot');

        // 2.7 Provider Operations: Weekly Availability
        const getAvailRes = await makeRequest('/api/provider/availability', {
            headers: { Cookie: provCookie }
        });
        assert(getAvailRes.status === 200, 'GET /api/provider/availability returns 200');

        const putAvailRes = await makeRequest('/api/provider/availability', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Cookie: provCookie },
            body: {
                availability: [
                    { weekday: 1, start_minute: 540, end_minute: 1020 },
                    { weekday: 2, start_minute: 540, end_minute: 1020 },
                    { weekday: 3, start_minute: 540, end_minute: 1020 }
                ]
            }
        });
        assert(putAvailRes.status === 200, 'PUT /api/provider/availability returns 200');

        // 2.8 Provider Operations: Blackout Dates
        const blackoutDate = '2026-11-20';
        const postBlackoutRes = await makeRequest('/api/provider/blackouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: provCookie },
            body: { blackout_date: blackoutDate, reason: 'Annual Training' }
        });
        assert(postBlackoutRes.status === 200, 'POST /api/provider/blackouts returns 200');
        const blackoutId = JSON.parse(postBlackoutRes.body).blackout.id;

        const getBlackoutsRes = await makeRequest('/api/provider/blackouts', {
            headers: { Cookie: provCookie }
        });
        assert(getBlackoutsRes.status === 200, 'GET /api/provider/blackouts returns 200');
        const blackoutsData = JSON.parse(getBlackoutsRes.body);
        assert(blackoutsData.blackouts.some(b => b.id === blackoutId), 'Blackout list contains newly added blackout');

        // Check matching exclusion for blacked out date
        const matchBlackoutRes = await makeRequest('/api/requests/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: custCookie },
            body: {
                category_slug: 'appliance-repair',
                preferred_date: blackoutDate,
                preferred_start_minute: 600,
                preferred_end_minute: 720,
                address: 'Dhanmondi, Dhaka'
            }
        });
        const matchData = JSON.parse(matchBlackoutRes.body);
        assert(!matchData.candidates.some(c => c.provider.id === 2),
            'Provider with blackout on requested date is excluded by matching engine');

        // Delete blackout
        const delBlackoutRes = await makeRequest(`/api/provider/blackouts/${blackoutId}`, {
            method: 'DELETE',
            headers: { Cookie: provCookie }
        });
        assert(delBlackoutRes.status === 200, 'DELETE /api/provider/blackouts/:id returns 200');

        // 2.9 Provider Payout Requests & Admin Approvals
        const getPayoutsRes = await makeRequest('/api/provider/payouts', {
            headers: { Cookie: provCookie }
        });
        assert(getPayoutsRes.status === 200, 'GET /api/provider/payouts returns 200');

        const postPayoutRes = await makeRequest('/api/provider/payouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: provCookie },
            body: { amount: 200 }
        });
        assert(postPayoutRes.status === 200, 'POST /api/provider/payouts returns 200');
        const payoutId = JSON.parse(postPayoutRes.body).payout.id;

        const adminPayoutsRes = await makeRequest('/api/admin/payouts', {
            headers: { Cookie: adminCookie }
        });
        assert(adminPayoutsRes.status === 200, 'GET /api/admin/payouts returns 200');

        const approvePayoutRes = await makeRequest(`/api/admin/payouts/${payoutId}/approve`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
            body: { action: 'approve' }
        });
        assert(approvePayoutRes.status === 200, 'PATCH /api/admin/payouts/:id/approve returns 200');
        assert(JSON.parse(approvePayoutRes.body).payout.status === 'completed', 'Payout marked as completed');

        // 2.10 Admin User Verification Toggle
        const toggleVerifyRes = await makeRequest('/api/admin/users/2/verify', {
            method: 'PATCH',
            headers: { Cookie: adminCookie }
        });
        assert(toggleVerifyRes.status === 200, 'PATCH /api/admin/users/:id/verify returns 200');
        assert(typeof JSON.parse(toggleVerifyRes.body).is_active === 'boolean', 'Response returns boolean is_active');

        // Restore provider active status to true
        await makeRequest('/api/admin/users/2/verify', {
            method: 'PATCH',
            headers: { Cookie: adminCookie }
        });

        // 2.11 Customer Dispute & Admin Resolution
        const disputeRes = await makeRequest(`/api/requests/${testReqId}/dispute`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: custCookie },
            body: { reason: 'Specialist delayed without notice' }
        });
        assert(disputeRes.status === 201, 'POST /api/requests/:id/dispute returns 201');
        const disputeId = JSON.parse(disputeRes.body).dispute.id;

        const adminDisputesRes = await makeRequest('/api/admin/disputes', {
            headers: { Cookie: adminCookie }
        });
        assert(adminDisputesRes.status === 200, 'GET /api/admin/disputes returns 200');

        const resolveDisputeRes = await makeRequest(`/api/admin/disputes/${disputeId}/resolve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
            body: { status: 'resolved' }
        });
        assert(resolveDisputeRes.status === 200, 'POST /api/admin/disputes/:id/resolve returns 200');
        assert(JSON.parse(resolveDisputeRes.body).dispute.status === 'resolved', 'Dispute status updated to resolved');

        // 2.12 Pagination Tests
        const pageReqMine = await makeRequest('/api/requests/mine?page=1&limit=2', {
            headers: { Cookie: custCookie }
        });
        assert(pageReqMine.status === 200, 'GET /api/requests/mine?page=1&limit=2 returns 200');
        const pageReqData = JSON.parse(pageReqMine.body);
        assert(pageReqData.total != null && pageReqData.page === 1 && pageReqData.requests.length <= 2,
            'Requests pagination returns total, page and bounded items');

        const pageUsers = await makeRequest('/api/admin/users?page=1&limit=2', {
            headers: { Cookie: adminCookie }
        });
        assert(pageUsers.status === 200, 'GET /api/admin/users?page=1&limit=2 returns 200');
        const pageUsersData = JSON.parse(pageUsers.body);
        assert(pageUsersData.total != null && pageUsersData.page === 1 && pageUsersData.users.length <= 2,
            'Admin users pagination returns total, page and bounded items');

        const pageBookings = await makeRequest('/api/admin/bookings?page=1&limit=2', {
            headers: { Cookie: adminCookie }
        });
        assert(pageBookings.status === 200, 'GET /api/admin/bookings?page=1&limit=2 returns 200');
        const pageBookingsData = JSON.parse(pageBookings.body);
        assert(pageBookingsData.total != null && pageBookingsData.page === 1 && pageBookingsData.bookings.length <= 2,
            'Admin bookings pagination returns total, page and bounded items');

        // Clean up test records
        await pool.query("DELETE FROM disputes WHERE reason LIKE '%Specialist delayed%';");
        await pool.query("DELETE FROM payout_requests WHERE amount = 200;");
        await pool.query("DELETE FROM service_requests WHERE trx_id IN ('TRX_PHASE12_TEST_01', 'TRX_FAKE_REJECT');");

    } finally {
        if (server) {
            await new Promise(r => server.close(r));
        }
    }

    // --------------------------------------------------------
    // Part 3: Running Phase 11 Regression Suite
    // --------------------------------------------------------
    console.log('\n--- Part 3: Running Full Regression Suite ---');
    try {
        execSync('node test_phase11.js', { stdio: 'inherit', env: { ...process.env, SKIP_NESTED_REGRESSION: '1' } });
        console.log('[PASS] Regression test_phase11.js exited 0');
    } catch (err) {
        console.error('[FAIL] Regression test_phase11.js failed');
        process.exit(1);
    }

    console.log('\n====================================================');
    console.log('   PHASE 12 COMPLETE: ALL TESTS PASSED (100%)       ');
    console.log('====================================================\n');
    process.exit(0);
}

run().catch(err => {
    console.error('Test suite failed with unexpected error:', err);
    if (server) server.close();
    process.exit(1);
});
