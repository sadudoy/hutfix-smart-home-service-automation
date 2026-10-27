/**
 * Phase 11 Verification Test Suite — Customer Experience & Gig Details
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');
const { pool } = require('./server/config/db');

let passCount = 0;
let failCount = 0;

function assert(condition, testName, details = '') {
    if (condition) {
        passCount++;
        console.log(`[PASS] ${testName}`);
    } else {
        failCount++;
        console.error(`[FAIL] ${testName} ${details ? '- ' + details : ''}`);
    }
}

console.log('====================================================');
console.log('   PHASE 11: CUSTOMER EXPERIENCE & GIG DETAILS     ');
console.log('====================================================\n');

async function runTests() {
    // --------------------------------------------------------
    // Part 1: Static Code & File Assertions
    // --------------------------------------------------------
    console.log('--- Part 1: Static Code & File Assertions ---');

    assert(fs.existsSync(path.join(__dirname, 'database', 'migrations', '002_add_addresses.sql')), 'database/migrations/002_add_addresses.sql exists');
    assert(fs.existsSync(path.join(__dirname, 'server', 'routes', 'addresses.routes.js')), 'server/routes/addresses.routes.js exists');
    assert(fs.existsSync(path.join(__dirname, 'server', 'routes', 'gigs.routes.js')), 'server/routes/gigs.routes.js exists');

    const reqCtrl = fs.readFileSync(path.join(__dirname, 'server', 'controllers', 'requests.controller.js'), 'utf8');
    assert(reqCtrl.includes('reschedule'), 'server/controllers/requests.controller.js contains reschedule');

    const appJs = fs.readFileSync(path.join(__dirname, 'client', 'app.js'), 'utf8');
    assert(appJs.includes('renderGigDetails'), 'client/app.js contains renderGigDetails');
    assert(appJs.includes('Saved Addresses'), 'client/app.js contains Saved Addresses');
    assert(appJs.includes('min_rating'), 'client/app.js contains min_rating');
    assert(appJs.includes('mock payment'), 'client/app.js contains mock payment');

    // --------------------------------------------------------
    // Part 2: Spawn Server for Functional HTTP Tests
    // --------------------------------------------------------
    console.log('\n--- Part 2: Functional Server & API Tests ---');

    const testPort = 5088;
    const serverProcess = spawn('node', ['server/index.js'], {
        env: { ...process.env, PORT: String(testPort), NODE_ENV: 'test' },
        stdio: ['ignore', 'pipe', 'pipe']
    });

    let serverReady = false;
    serverProcess.stdout.on('data', (d) => {
        const str = d.toString();
        if (str.includes('Server ready:')) serverReady = true;
    });

    for (let i = 0; i < 40; i++) {
        if (serverReady) break;
        await new Promise(r => setTimeout(r, 100));
    }

    const baseUrl = `http://localhost:${testPort}`;

    try {
        // 1. GET /api/gigs/2 (public)
        const gigRes = await fetch(`${baseUrl}/api/gigs/2`);
        assert(gigRes.status === 200, 'GET /api/gigs/2 (public) returns 200');
        const gigData = await gigRes.json();
        assert(gigData.ok === true, 'Gig details response ok: true');
        assert(gigData.provider && gigData.provider.id === '2', 'Gig data includes provider id 2');
        assert(Array.isArray(gigData.provider.services), 'Gig provider includes services list');
        assert(Array.isArray(gigData.reviews), 'Gig response includes reviews array');
        assert(Array.isArray(gigData.ratingBreakdown), 'Gig response includes ratingBreakdown array');

        // 2. Customer Auth & Address Book Endpoints
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
        });
        assert(loginRes.status === 200, 'Customer login returns 200');
        const rawCookie = loginRes.headers.get('set-cookie');
        const cookie = rawCookie ? rawCookie.split(';')[0] : '';
        assert(cookie.includes('hutfix_token'), 'Customer login returns auth cookie');

        // POST /api/addresses
        const createAddrRes = await fetch(`${baseUrl}/api/addresses`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ label: 'Home', address_line: 'Dhanmondi, Dhaka', is_default: true })
        });
        assert(createAddrRes.status === 200 || createAddrRes.status === 201, 'POST /api/addresses returns 200');
        const createAddrData = await createAddrRes.json();
        assert(createAddrData.ok === true && createAddrData.address.id != null, 'Address created with valid id');
        const addressId = createAddrData.address.id;

        // GET /api/addresses
        const listAddrRes = await fetch(`${baseUrl}/api/addresses`, {
            headers: { Cookie: cookie }
        });
        assert(listAddrRes.status === 200, 'GET /api/addresses returns 200');
        const listAddrData = await listAddrRes.json();
        assert(Array.isArray(listAddrData.addresses) && listAddrData.addresses.length >= 1, 'GET /api/addresses length >= 1');

        // PATCH /api/addresses/:id
        const patchAddrRes = await fetch(`${baseUrl}/api/addresses/${addressId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({ label: 'Work', address_line: 'Gulshan 2, Dhaka', is_default: false })
        });
        assert(patchAddrRes.status === 200, 'PATCH /api/addresses/:id returns 200');
        const patchAddrData = await patchAddrRes.json();
        assert(patchAddrData.address.label === 'Work' && patchAddrData.address.address_line === 'Gulshan 2, Dhaka', 'Address record successfully updated');

        // DELETE /api/addresses/:id
        const delAddrRes = await fetch(`${baseUrl}/api/addresses/${addressId}`, {
            method: 'DELETE',
            headers: { Cookie: cookie }
        });
        assert(delAddrRes.status === 200, 'DELETE /api/addresses/:id returns 200');
        const delAddrData = await delAddrRes.json();
        assert(delAddrData.ok === true, 'DELETE address response ok: true');

        // 3. Reschedule Lifecycle Test
        // Create request
        const createReqRes = await fetch(`${baseUrl}/api/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({
                category_slug: 'appliance-repair',
                provider_id: 2,
                preferred_date: '2026-11-25',
                preferred_start_minute: 540,
                preferred_end_minute: 660,
                address: 'Dhanmondi, Dhaka',
                description: '__phase11_test_reschedule__'
            })
        });
        assert(createReqRes.status === 201 || createReqRes.status === 200, 'POST /api/requests returns 200/201');
        const reqData = await createReqRes.json();
        const requestId = reqData.request.id;

        // Verify initial slot in provider_bookings
        const initSlot = await pool.query('SELECT slot_date, start_minute, end_minute FROM provider_bookings WHERE request_id = $1', [requestId]);
        assert(initSlot.rows.length === 1 && initSlot.rows[0].start_minute === 540, 'Initial provider_bookings slot is 540 (09:00 AM)');

        // PATCH /api/requests/:id/reschedule
        const reschedRes = await fetch(`${baseUrl}/api/requests/${requestId}/reschedule`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: cookie },
            body: JSON.stringify({
                new_date: '2026-11-26',
                new_start_minute: 840,
                new_end_minute: 960
            })
        });
        assert(reschedRes.status === 200, 'PATCH /api/requests/:id/reschedule returns 200');
        const reschedData = await reschedRes.json();
        assert(reschedData.ok === true, 'Reschedule response ok: true');

        // Verify slot changed in DB
        const updatedSlot = await pool.query('SELECT slot_date, start_minute, end_minute FROM provider_bookings WHERE request_id = $1', [requestId]);
        assert(updatedSlot.rows.length === 1, 'Provider booking exists for rescheduled request');
        assert(updatedSlot.rows[0].start_minute === 840, 'Provider booking slot updated to 840 (02:00 PM)');
        const updatedReq = await pool.query('SELECT preferred_date, preferred_start_minute FROM service_requests WHERE id = $1', [requestId]);
        assert(updatedReq.rows[0].preferred_start_minute === 840, 'service_requests preferred_start_minute updated in DB');

        // Clean up test request
        await pool.query('DELETE FROM provider_bookings WHERE request_id = $1', [requestId]);
        await pool.query('DELETE FROM request_status_events WHERE request_id = $1', [requestId]);
        await pool.query('DELETE FROM service_requests WHERE id = $1', [requestId]);

        // 4. Provider Search Filters Test
        const filterRes = await fetch(`${baseUrl}/api/providers/search?min_rating=4.8`);
        assert(filterRes.status === 200, 'GET /api/providers/search?min_rating=4.8 returns 200');
        const filterData = await filterRes.json();
        assert(Array.isArray(filterData.providers) && filterData.providers.length > 0, 'Returned providers array is non-empty');
        const allRatingsGte = filterData.providers.every(p => parseFloat(p.rating) >= 4.8);
        assert(allRatingsGte, 'All returned providers have rating >= 4.8');

    } finally {
        serverProcess.kill();
    }

    // --------------------------------------------------------
    // Part 3: Running Phase 10.1 Regression Suite
    // --------------------------------------------------------
    console.log('\n--- Part 3: Running Phase 10.1 Regression Suite ---');
    try {
        execSync('node test_phase10_1.js', {
            stdio: 'inherit',
            env: { ...process.env, SKIP_NESTED_REGRESSION: '1' }
        });
        assert(true, 'Regression test_phase10_1.js exited 0');
    } catch (err) {
        assert(false, 'Regression test_phase10_1.js failed', err.message);
    }

    console.log('\n====================================================');
    console.log(`PHASE 11 TEST RESULTS: PASS ${passCount} / FAIL ${failCount}`);
    console.log('====================================================\n');

    await pool.end();
    if (failCount > 0) process.exit(1);
}

runTests().catch(err => {
    console.error('Test execution failed:', err);
    process.exit(1);
});
