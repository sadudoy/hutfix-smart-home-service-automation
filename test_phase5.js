/**
 * Phase 5 Verification Test Suite — Request Lifecycle, Tracking Page & Provider Dashboard
 *
 * Verifies:
 * 1. Static file and code assertions (lifecycle state machine, routes, UI pages, CSS tokens/components).
 * 2. Integration HTTP assertions (lifecycle transitions, customer cancel, provider accept/reject, buckets).
 * 3. Stepper & status timeline tracking, access control guards, and timezone formatting.
 * 4. Regression checks: Phases 0, 1, 2, 3, 4 test suites exit 0.
 */

const fs = require('fs');
const path = require('path');
const { spawn, execSync } = require('child_process');
const { Pool } = require('pg');

let passCount = 0;
let failCount = 0;
let skipCount = 0;

function assert(condition, testName, details = '') {
    if (condition) {
        passCount++;
        console.log(`[PASS] ${testName}`);
    } else {
        failCount++;
        console.error(`[FAIL] ${testName} ${details ? '- ' + details : ''}`);
    }
}

function skip(testName, reason = '') {
    skipCount++;
    console.log(`[SKIP] ${testName} - ${reason}`);
}

function getNextSaturday() {
    const d = new Date();
    const day = d.getUTCDay(); // 0 is Sunday, 6 is Saturday
    let diff = (6 - day + 7) % 7;
    if (diff === 0) diff = 7;
    d.setUTCDate(d.getUTCDate() + diff);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(d.getUTCDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

console.log('====================================================');
console.log('   PHASE 5: LIFECYCLE, TRACKING & PROVIDER SUITE    ');
console.log('====================================================\n');

async function runTests() {
    // --------------------------------------------------------
    // 1. Static Assertions
    // --------------------------------------------------------
    console.log('--- 1. Static File & Code Structure Checks ---');

    const isLegacy = fs.existsSync(path.resolve(__dirname, 'client/customer.html')) || fs.existsSync(path.resolve(__dirname, 'client/_legacy_phase9/customer.html'));
    const legacyDir = fs.existsSync(path.resolve(__dirname, 'client/customer.html')) ? 'client' : 'client/_legacy_phase9';
    const requiredFiles = [
        'server/services/lifecycle.service.js',
        'server/routes/provider.routes.js',
        isLegacy ? `${legacyDir}/customer.html` : 'client/tracking.html',
        isLegacy ? `${legacyDir}/provider.html` : 'client/provider.html',
        isLegacy ? `${legacyDir}/customer.js` : 'client/js/tracking.js',
        isLegacy ? `${legacyDir}/provider.js` : 'client/js/provider.js',
        isLegacy ? `${legacyDir}/customer.css` : 'client/css/tokens.css',
        isLegacy ? `${legacyDir}/global.css` : 'client/css/components.css',
        'test_phase5.js'
    ];

    requiredFiles.forEach(file => {
        const fullPath = path.resolve(__dirname, file);
        assert(fs.existsSync(fullPath), `Required file exists: ${file}`);
    });

    const lifecycleContent = fs.readFileSync(path.resolve(__dirname, 'server/services/lifecycle.service.js'), 'utf8');
    assert(lifecycleContent.includes('ALLOWED'), 'lifecycle.service.js contains ALLOWED');
    assert(lifecycleContent.includes('canTransition'), 'lifecycle.service.js contains canTransition');

    const reqCtrlContent = fs.readFileSync(path.resolve(__dirname, 'server/controllers/requests.controller.js'), 'utf8');
    assert(reqCtrlContent.includes('customerCancel'), 'requests.controller.js contains customerCancel');
    assert(reqCtrlContent.includes('acceptRequest'), 'requests.controller.js contains acceptRequest');
    assert(reqCtrlContent.includes('rejectRequest'), 'requests.controller.js contains rejectRequest');
    assert(reqCtrlContent.includes('updateStatus'), 'requests.controller.js contains updateStatus');
    assert(reqCtrlContent.includes('providerRequests'), 'requests.controller.js contains providerRequests');

    const reqRoutesContent = fs.readFileSync(path.resolve(__dirname, 'server/routes/requests.routes.js'), 'utf8');
    assert(reqRoutesContent.includes('/:id/cancel'), 'requests.routes.js contains /:id/cancel');
    assert(reqRoutesContent.includes('/:id/accept'), 'requests.routes.js contains /:id/accept');
    assert(reqRoutesContent.includes('/:id/reject'), 'requests.routes.js contains /:id/reject');
    assert(reqRoutesContent.includes('/:id/status'), 'requests.routes.js contains /:id/status');
    assert(reqRoutesContent.includes('/:id'), 'requests.routes.js contains /:id');

    const serverIndexContent = fs.readFileSync(path.resolve(__dirname, 'server/index.js'), 'utf8');
    assert(serverIndexContent.includes('/api/provider'), 'server/index.js mounts /api/provider');

    const trackingHtmlPath = isLegacy ? path.resolve(__dirname, `${legacyDir}/customer.html`) : path.resolve(__dirname, 'client/tracking.html');
    const trackingHtmlContent = fs.readFileSync(trackingHtmlPath, 'utf8');
    assert(trackingHtmlContent.includes('id="bookings-list"') || trackingHtmlContent.includes('id="request-list"'), 'Tracking/bookings list present');
    assert(trackingHtmlContent.includes('id="booking-form"') || trackingHtmlContent.includes('id="request-detail"'), 'Request form/detail present');
    assert(trackingHtmlContent.includes('timeline') || fs.readFileSync(path.resolve(__dirname, `${legacyDir}/customer.css`), 'utf8').includes('timeline'), 'Timeline stepper present');

    const providerHtmlContent = fs.readFileSync(path.resolve(__dirname, `${legacyDir}/provider.html`), 'utf8');
    assert(providerHtmlContent.includes('id="requests-list"') || providerHtmlContent.includes('id="requests-grid"'), 'Provider requests container present');
    assert(providerHtmlContent.includes('section-requests') || providerHtmlContent.includes('id="tab-incoming"'), 'Provider incoming tab present');
    assert(providerHtmlContent.includes('request-badge') || providerHtmlContent.includes('id="incoming-count"'), 'Provider incoming count present');

    const apiJsPath = fs.existsSync(path.resolve(__dirname, `${legacyDir}/js/api.js`)) ? path.resolve(__dirname, `${legacyDir}/js/api.js`) : path.resolve(__dirname, 'client/js/api.js');
    const apiJsContent = fs.readFileSync(apiJsPath, 'utf8');
    assert(apiJsContent.includes('patch(') || apiJsContent.includes('patch'), 'api.js contains patch');

    const provJsPath = isLegacy ? path.resolve(__dirname, `${legacyDir}/provider.js`) : path.resolve(__dirname, 'client/js/provider.js');
    const providerJsContent = fs.readFileSync(provJsPath, 'utf8');
    assert(providerJsContent.includes('/api/provider/requests'), 'provider.js contains /api/provider/requests');

    const authJsPath = isLegacy ? path.resolve(__dirname, `${legacyDir}/auth.js`) : path.resolve(__dirname, 'client/js/auth.js');
    const authJsContent = fs.readFileSync(authJsPath, 'utf8');
    const hasRedirectLogic = (authJsContent.includes('customer.html') || authJsContent.includes('tracking.html')) && authJsContent.includes('provider.html');
    assert(hasRedirectLogic, 'auth.js contains role redirect logic');

    // --------------------------------------------------------
    // 2. Integration Assertions (HTTP against running server)
    // --------------------------------------------------------
    console.log('\n--- 2. Integration HTTP Checks (Spawn Server) ---');
    const envConfig = require('./server/config/env');
    const port = envConfig.PORT || 3000;
    const baseUrl = `http://localhost:${port}`;

    let pool = null;

    try {
        pool = new Pool({ connectionString: envConfig.DATABASE_URL });

        // Initial test cleanup
        await pool.query("DELETE FROM request_status_events WHERE request_id IN (SELECT id FROM service_requests WHERE address LIKE '%__phase5_test_%');");
        await pool.query("DELETE FROM provider_bookings WHERE request_id IN (SELECT id FROM service_requests WHERE address LIKE '%__phase5_test_%');");
        await pool.query("DELETE FROM service_requests WHERE address LIKE '%__phase5_test_%';");

        // Clean occupied port
        try {
            if (process.platform === 'win32') {
                const findCmd = `netstat -ano | findstr :${port}`;
                const output = execSync(findCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
                const lines = output.trim().split('\n');
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && parseInt(pid, 10) > 0 && parseInt(pid, 10) !== process.pid) {
                        try { execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' }); } catch (_) {}
                    }
                }
            }
        } catch (_) {}

        const serverProc = spawn('node', ['server/index.js'], {
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        process.on('exit', () => {
            try { serverProc.kill(); } catch (_) {}
        });

        // Wait for server health
        let healthy = false;
        const startTime = Date.now();
        while (Date.now() - startTime < 8000) {
            try {
                const hRes = await fetch(`${baseUrl}/api/health`);
                if (hRes.status === 200) {
                    const hJson = await hRes.json();
                    if (hJson.ok && hJson.db === 'connected') {
                        healthy = true;
                        break;
                    }
                }
            } catch (_) {}
            await new Promise(r => setTimeout(r, 200));
        }

        assert(healthy, 'Server spawned and responds 200 to /api/health');

        if (!healthy) {
            try { serverProc.kill(); } catch (_) {}
            throw new Error('Server failed to start in time');
        }

        // 1. Login Customer
        const custLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
        });
        assert(custLoginRes.status === 200, 'Customer login returns 200');
        const customerCookie = (custLoginRes.headers.get('set-cookie') || '').split(';')[0];
        assert(customerCookie.includes('hutfix_token'), 'Customer cookie obtained');

        // 2. Login Provider (provider_id=2 corresponds to provider1@demo.test)
        const provLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'provider1@demo.test', password: 'demo1234' })
        });
        assert(provLoginRes.status === 200, 'Provider login returns 200');
        const providerCookie = (provLoginRes.headers.get('set-cookie') || '').split(';')[0];
        assert(providerCookie.includes('hutfix_token'), 'Provider cookie obtained');

        const testDate = getNextSaturday();
        console.log(`Testing with date: ${testDate}`);

        // Helper: create test request
        async function createTestRequest(address, startMin, endMin) {
            const fd = new FormData();
            fd.append('category_slug', 'appliance-repair');
            fd.append('preferred_date', testDate);
            fd.append('preferred_start_minute', String(startMin));
            fd.append('preferred_end_minute', String(endMin));
            fd.append('urgency', 'normal');
            fd.append('address', address);
            fd.append('provider_id', '2');
            fd.append('description', 'Lifecycle test request');

            const res = await fetch(`${baseUrl}/api/requests`, {
                method: 'POST',
                headers: { Cookie: customerCookie },
                body: fd
            });
            const data = await res.json();
            return { res, data };
        }

        // Test 1: Create request
        const req1 = await createTestRequest('Dhanmondi __phase5_test_create__', 600, 660);
        assert(req1.res.status === 200, `POST /api/requests returns 200 (got ${req1.res.status})`);
        const reqId = req1.data.request.id;
        assert(reqId != null, `Captured test request ID: ${reqId}`);

        // Test 2: Provider incoming requests
        const incomingRes = await fetch(`${baseUrl}/api/provider/requests?bucket=incoming`, {
            headers: { Cookie: providerCookie }
        });
        assert(incomingRes.status === 200, 'GET /api/provider/requests?bucket=incoming returns 200');
        const incomingData = await incomingRes.json();
        const foundInIncoming = incomingData.requests && incomingData.requests.some(r => Number(r.id) === Number(reqId));
        assert(foundInIncoming, 'Provider incoming bucket contains newly created reqId');

        // Test 3: Accept request
        const acceptRes = await fetch(`${baseUrl}/api/requests/${reqId}/accept`, {
            method: 'POST',
            headers: { Cookie: providerCookie }
        });
        assert(acceptRes.status === 200, 'POST /api/requests/:id/accept returns 200');
        const acceptData = await acceptRes.json();
        assert(acceptData.request && acceptData.request.status === 'accepted', 'Request status transitioned to "accepted"');

        // Test 4: Double-accept conflict
        const doubleAcceptRes = await fetch(`${baseUrl}/api/requests/${reqId}/accept`, {
            method: 'POST',
            headers: { Cookie: providerCookie }
        });
        assert(doubleAcceptRes.status === 409, `Double-accept returns 409 (got ${doubleAcceptRes.status})`);
        const doubleAcceptData = await doubleAcceptRes.json();
        assert(doubleAcceptData.error && /already/i.test(doubleAcceptData.error), 'Conflict error matches /already/i');

        // Test 5: GET one as customer
        const getOneRes = await fetch(`${baseUrl}/api/requests/${reqId}`, {
            headers: { Cookie: customerCookie }
        });
        assert(getOneRes.status === 200, 'GET /api/requests/:id returns 200');
        const getOneData = await getOneRes.json();
        assert(getOneData.request && getOneData.request.status === 'accepted', 'GET /api/requests/:id returns status="accepted"');
        assert(Array.isArray(getOneData.events) && getOneData.events.length >= 2, `events length >= 2 (got ${getOneData.events ? getOneData.events.length : 0})`);

        // Test 6: GET one as wrong customer (register fresh customer)
        const freshEmail = `intruder_${Date.now()}@demo.test`;
        const regRes = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: freshEmail, password: 'password123', full_name: 'Intruder', role: 'customer' })
        });
        const wrongCustCookie = (regRes.headers.get('set-cookie') || '').split(';')[0];
        const forbiddenRes = await fetch(`${baseUrl}/api/requests/${reqId}`, {
            headers: { Cookie: wrongCustCookie }
        });
        assert(forbiddenRes.status === 403, `GET /api/requests/:id as unauthorized customer returns 403 (got ${forbiddenRes.status})`);

        // Test 7: Status progression (on_the_way -> in_progress -> completed)
        const s1 = await fetch(`${baseUrl}/api/requests/${reqId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: providerCookie },
            body: JSON.stringify({ status: 'on_the_way' })
        });
        const s1Data = await s1.json();
        assert(s1.status === 200 && s1Data.request.status === 'on_the_way', 'PATCH status to "on_the_way" returns 200');

        const s2 = await fetch(`${baseUrl}/api/requests/${reqId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: providerCookie },
            body: JSON.stringify({ status: 'in_progress' })
        });
        const s2Data = await s2.json();
        assert(s2.status === 200 && s2Data.request.status === 'in_progress', 'PATCH status to "in_progress" returns 200');

        const s3 = await fetch(`${baseUrl}/api/requests/${reqId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: providerCookie },
            body: JSON.stringify({ status: 'completed' })
        });
        const s3Data = await s3.json();
        assert(s3.status === 200 && s3Data.request.status === 'completed', 'PATCH status to "completed" returns 200');

        // Test 8: Invalid transition
        const req2 = await createTestRequest('Dhanmondi __phase5_test_invalid__', 660, 720);
        const req2Id = req2.data.request.id;
        await fetch(`${baseUrl}/api/requests/${req2Id}/accept`, { method: 'POST', headers: { Cookie: providerCookie } });
        const invalidTransRes = await fetch(`${baseUrl}/api/requests/${req2Id}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: providerCookie },
            body: JSON.stringify({ status: 'completed' })
        });
        assert(invalidTransRes.status === 400, `Invalid transition (accepted -> completed) returns 400 (got ${invalidTransRes.status})`);
        const invalidTransData = await invalidTransRes.json();
        assert(invalidTransData.error && /invalid transition/i.test(invalidTransData.error), 'Error matches /invalid transition/i');

        // Test 9: Customer cancel
        const req3 = await createTestRequest('Dhanmondi __phase5_test_cancel__', 720, 780);
        const req3Id = req3.data.request.id;
        const cancelRes = await fetch(`${baseUrl}/api/requests/${req3Id}/cancel`, {
            method: 'POST',
            headers: { Cookie: customerCookie }
        });
        assert(cancelRes.status === 200, `POST /api/requests/:id/cancel returns 200 (got ${cancelRes.status})`);
        const cancelData = await cancelRes.json();
        assert(cancelData.request && cancelData.request.status === 'cancelled', 'Cancelled request has status="cancelled"');

        const bookingCountCheck = await pool.query(
            'SELECT COUNT(*)::int AS count FROM provider_bookings WHERE request_id = $1;',
            [req3Id]
        );
        assert(bookingCountCheck.rows[0].count === 0, 'DB assertion: booking row deleted upon cancellation (count === 0)');

        // Test 10: Provider reject
        const req4 = await createTestRequest('Dhanmondi __phase5_test_reject__', 780, 840);
        const req4Id = req4.data.request.id;
        const rejectRes = await fetch(`${baseUrl}/api/requests/${req4Id}/reject`, {
            method: 'POST',
            headers: { Cookie: providerCookie }
        });
        assert(rejectRes.status === 200, `POST /api/requests/:id/reject returns 200 (got ${rejectRes.status})`);
        const rejectData = await rejectRes.json();
        assert(rejectData.request && rejectData.request.status === 'cancelled', 'Rejected request has status="cancelled"');

        const rejectBookingCheck = await pool.query(
            'SELECT COUNT(*)::int AS count FROM provider_bookings WHERE request_id = $1;',
            [req4Id]
        );
        assert(rejectBookingCheck.rows[0].count === 0, 'DB assertion: booking row deleted upon provider reject (count === 0)');

        // Test 11: Bucket contents verification
        const historyRes = await fetch(`${baseUrl}/api/provider/requests?bucket=history`, {
            headers: { Cookie: providerCookie }
        });
        const historyData = await historyRes.json();
        const inHistory = historyData.requests && historyData.requests.some(r => Number(r.id) === Number(reqId));
        assert(inHistory, 'Provider history bucket includes the completed request');

        const activeRes = await fetch(`${baseUrl}/api/provider/requests?bucket=active`, {
            headers: { Cookie: providerCookie }
        });
        const activeData = await activeRes.json();
        const inActive = activeData.requests && activeData.requests.some(r => Number(r.id) === Number(reqId));
        assert(!inActive, 'Provider active bucket does NOT include completed request');

        // Test 12: Auth Guard: Customer cannot accept request
        const custAcceptRes = await fetch(`${baseUrl}/api/requests/${reqId}/accept`, {
            method: 'POST',
            headers: { Cookie: customerCookie }
        });
        assert(custAcceptRes.status === 403, `POST /api/requests/:id/accept with customer cookie returns 403 (got ${custAcceptRes.status})`);

        // Test 13: Timezone format check in GET /api/requests/:id
        const verifyOneRes = await fetch(`${baseUrl}/api/requests/${reqId}`, {
            headers: { Cookie: customerCookie }
        });
        const verifyOneData = await verifyOneRes.json();
        assert(/^\d{4}-\d{2}-\d{2}$/.test(verifyOneData.request.preferred_date), `preferred_date matches YYYY-MM-DD: ${verifyOneData.request.preferred_date}`);

        // Test 14: Timeline ordering verification
        const evs = verifyOneData.events;
        assert(evs && evs.length >= 4, `Events recorded: ${evs.length}`);
        assert(evs[0].status === 'requested', `First event status === 'requested' (got ${evs[0].status})`);
        assert(evs[evs.length - 1].status === 'completed', `Last event status === 'completed' (got ${evs[evs.length - 1].status})`);

        // Final test cleanup
        await pool.query("DELETE FROM request_status_events WHERE request_id IN (SELECT id FROM service_requests WHERE address LIKE '%__phase5_test_%');");
        await pool.query("DELETE FROM provider_bookings WHERE request_id IN (SELECT id FROM service_requests WHERE address LIKE '%__phase5_test_%');");
        await pool.query("DELETE FROM service_requests WHERE address LIKE '%__phase5_test_%';");
        await pool.query("DELETE FROM users WHERE email = $1;", [freshEmail]);

        try { serverProc.kill(); } catch (_) {}
    } catch (err) {
        console.error('Integration test exception:', err);
        assert(false, `Integration test failed with error: ${err.message}`);
    } finally {
        if (pool) {
            await pool.end();
        }
    }

    // --------------------------------------------------------
    // 3. Regression Suite Checks (Phases 0, 1, 2, 3, 4)
    // --------------------------------------------------------
    console.log('\n--- 3. Regression Suite Checks (Phases 0, 1, 2, 3, 4) ---');
    if (!process.env.SKIP_NESTED_REGRESSION) {
        try {
            execSync('node test_phase0.js', { stdio: 'inherit' });
            assert(true, 'Regression: node test_phase0.js passed cleanly (exit 0)');
        } catch (e) {
            assert(false, 'Regression: node test_phase0.js failed');
        }

        try {
            execSync('node test_phase1.js', { stdio: 'inherit' });
            assert(true, 'Regression: node test_phase1.js passed cleanly (exit 0)');
        } catch (e) {
            assert(false, 'Regression: node test_phase1.js failed');
        }

        try {
            execSync('node test_phase2.js', { stdio: 'inherit' });
            assert(true, 'Regression: node test_phase2.js passed cleanly (exit 0)');
        } catch (e) {
            assert(false, 'Regression: node test_phase2.js failed');
        }

        try {
            execSync('node test_phase3.js', { stdio: 'inherit' });
            assert(true, 'Regression: node test_phase3.js passed cleanly (exit 0)');
        } catch (e) {
            assert(false, 'Regression: node test_phase3.js failed');
        }

        try {
            execSync('node test_phase4.js', { stdio: 'inherit' });
            assert(true, 'Regression: node test_phase4.js passed cleanly (exit 0)');
        } catch (e) {
            assert(false, 'Regression: node test_phase4.js failed');
        }
    } else {
        console.log('[INFO] Nested regression skipped via SKIP_NESTED_REGRESSION');
    }

    // --------------------------------------------------------
    // Summary
    // --------------------------------------------------------
    console.log('\n====================================================');
    console.log(`PASS ${passCount} / FAIL ${failCount} / SKIP ${skipCount}`);
    console.log('====================================================');

    if (failCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests();

