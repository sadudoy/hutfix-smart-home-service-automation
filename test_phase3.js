/**
 * Phase 3 Verification Test Suite — Service Catalog, Smart Matching, Request Creation
 *
 * Verifies:
 * 1. Static file and code assertions (catalog, matching engine, multer upload, controllers, routes, HTML/JS).
 * 2. Integration HTTP assertions (services list/slug, provider matching, multipart request creation, slot conflict).
 * 3. Database persistence check (provider_bookings & request_status_events transaction integrity).
 * 4. Regression checks (Phase 0, Phase 1, Phase 2 test suites exit 0).
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
console.log('   PHASE 3: SERVICE CATALOG & MATCHING TEST SUITE   ');
console.log('====================================================\n');

async function runTests() {
    // --------------------------------------------------------
    // 1. Static Assertions
    // --------------------------------------------------------
    console.log('--- 1. Static File & Code Structure Checks ---');

    const isLegacy = fs.existsSync(path.resolve(__dirname, 'client/customer.html'));
    const requiredFiles = [
        'server/controllers/services.controller.js',
        'server/controllers/requests.controller.js',
        'server/routes/services.routes.js',
        'server/routes/requests.routes.js',
        'server/services/matching.service.js',
        'server/middleware/upload.js',
        isLegacy ? 'client/customer.html' : 'client/request.html',
        isLegacy ? 'client/customer.js' : 'client/js/request.js',
        'test_phase3.js'
    ];

    requiredFiles.forEach(file => {
        const fullPath = path.resolve(__dirname, file);
        assert(fs.existsSync(fullPath), `Required file exists: ${file}`);
    });

    const matchingContent = fs.readFileSync(path.resolve(__dirname, 'server/services/matching.service.js'), 'utf8');
    assert(matchingContent.includes('haversine'), 'matching.service.js contains haversine');
    assert(matchingContent.includes('matchProviders'), 'matching.service.js contains matchProviders');
    assert(matchingContent.includes('rating_score') || matchingContent.includes('rating'), 'matching.service.js contains rating_score/rating');
    assert(matchingContent.includes('distance'), 'matching.service.js contains distance');

    const requestsCtrlContent = fs.readFileSync(path.resolve(__dirname, 'server/controllers/requests.controller.js'), 'utf8');
    assert(requestsCtrlContent.includes('BEGIN'), 'requests.controller.js contains BEGIN');
    assert(requestsCtrlContent.includes('COMMIT'), 'requests.controller.js contains COMMIT');
    assert(requestsCtrlContent.includes('ROLLBACK'), 'requests.controller.js contains ROLLBACK');
    assert(requestsCtrlContent.includes('23505'), 'requests.controller.js contains 23505');
    assert(requestsCtrlContent.includes('provider_bookings'), 'requests.controller.js contains provider_bookings');

    const uploadContent = fs.readFileSync(path.resolve(__dirname, 'server/middleware/upload.js'), 'utf8');
    assert(uploadContent.includes('multer'), 'upload.js contains multer');
    assert(uploadContent.includes('diskStorage'), 'upload.js contains diskStorage');
    assert(uploadContent.includes('5 * 1024 * 1024'), 'upload.js contains 5 * 1024 * 1024');

    const indexHtmlContent = fs.readFileSync(path.resolve(__dirname, 'client/index.html'), 'utf8');
    assert(indexHtmlContent.includes('services-grid'), 'client/index.html contains services-grid');
    assert(isLegacy || indexHtmlContent.includes('/request.html'), 'client/index.html contains link to /request.html or booking flow');
    const reqHtmlPath = isLegacy ? path.resolve(__dirname, 'client/customer.html') : path.resolve(__dirname, 'client/request.html');
    const reqHtmlContent = fs.readFileSync(reqHtmlPath, 'utf8');
    assert(reqHtmlContent.includes('id="request-form"') || reqHtmlContent.includes('id="booking-form"'), 'request/booking form present');
    assert(reqHtmlContent.includes('id="match-list"') || reqHtmlContent.includes('id="match-result-container"'), 'match container present');
    assert(reqHtmlContent.includes('id="req-category"') || reqHtmlContent.includes('id="book-category"'), 'category selector present');
    assert(isLegacy || reqHtmlContent.includes('id="req-image"'), 'image upload check');

    const reqJsContent = fs.readFileSync(path.resolve(__dirname, 'client/js/request.js'), 'utf8');
    assert(reqJsContent.includes('/api/requests/match'), 'client/js/request.js contains /api/requests/match');
    assert(reqJsContent.includes('FormData'), 'client/js/request.js contains FormData');
    assert(reqJsContent.includes('Dhanmondi') || reqJsContent.includes('dhanmondi'), 'client/js/request.js contains Dhanmondi in AREAS');

    const gitignoreContent = fs.readFileSync(path.resolve(__dirname, '.gitignore'), 'utf8');
    assert(gitignoreContent.includes('server/uploads/'), '.gitignore contains server/uploads/');

    const serverIndexContent = fs.readFileSync(path.resolve(__dirname, 'server/index.js'), 'utf8');
    assert(serverIndexContent.includes('/api/services'), 'server/index.js mounts /api/services');
    assert(serverIndexContent.includes('/api/requests'), 'server/index.js mounts /api/requests');
    assert(serverIndexContent.includes('/uploads'), 'server/index.js mounts /uploads');

    // --------------------------------------------------------
    // 2. Integration Assertions (HTTP against running server)
    // --------------------------------------------------------
    console.log('\n--- 2. Integration HTTP Checks (Spawn Server) ---');
    let createdRequestId = null;
    let pool = null;

    try {
        const envConfig = require('./server/config/env');
        const port = envConfig.PORT || 3000;
        const baseUrl = `http://localhost:${port}`;

        // Free port if occupied
        try {
            if (process.platform === 'win32') {
                const findCmd = `netstat -ano | findstr :${port}`;
                const output = execSync(findCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
                const lines = output.trim().split('\n');
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && parseInt(pid, 10) > 0 && parseInt(pid, 10) !== process.pid) {
                        try {
                            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                        } catch (_) {}
                    }
                }
            }
        } catch (_) {}

        const serverProc = spawn('node', ['server/index.js'], {
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Ensure server is killed on process exit
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

        // Idempotency: clean up any leftover records from prior test runs
        const setupPool = new Pool({ connectionString: envConfig.DATABASE_URL });
        try {
            await setupPool.query("DELETE FROM provider_bookings WHERE request_id IN (SELECT id FROM service_requests WHERE description = 'Test automated booking');");
            await setupPool.query("DELETE FROM request_status_events WHERE request_id IN (SELECT id FROM service_requests WHERE description = 'Test automated booking');");
            await setupPool.query("DELETE FROM service_requests WHERE description = 'Test automated booking';");
        } finally {
            await setupPool.end();
        }

        // Test 1: GET /api/services (public)
        const svcRes = await fetch(`${baseUrl}/api/services`);
        assert(svcRes.status === 200, 'GET /api/services returns status 200');
        const svcData = await svcRes.json();
        assert(svcData.ok === true, 'GET /api/services body.ok is true');
        assert(Array.isArray(svcData.services) && svcData.services.length === 8, 'GET /api/services returns 8 categories');
        const firstSvc = svcData.services[0];
        assert(firstSvc && firstSvc.slug && firstSvc.name && firstSvc.base_price, 'First category has slug, name, and base_price');

        // Test 2: Customer Login
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
        });
        assert(loginRes.status === 200, 'Customer login returns 200');
        const rawCookie = loginRes.headers.get('set-cookie') || '';
        const customerCookie = rawCookie.split(';')[0];
        assert(customerCookie.includes('hutfix_token'), 'Customer login returns hutfix_token cookie');

        // Test 3: POST /api/requests/match (authenticated customer)
        const nextSaturday = getNextSaturday();
        console.log(`Using next Saturday date: ${nextSaturday}`);

        const matchPayload = {
            category_slug: 'appliance-repair',
            preferred_date: nextSaturday,
            preferred_start_minute: 960,
            preferred_end_minute: 1080,
            urgency: 'normal',
            address: 'Dhanmondi',
            latitude: 23.7461,
            longitude: 90.3742
        };

        let matchRes = await fetch(`${baseUrl}/api/requests/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': customerCookie
            },
            body: JSON.stringify(matchPayload)
        });

        assert(matchRes.status === 200, 'POST /api/requests/match returns 200');
        let matchData = await matchRes.json();

        // Seed data gap fallback if candidates empty
        if (!matchData.candidates || matchData.candidates.length === 0) {
            console.log('Candidates list was empty; running seed fallback...');
            try {
                const { DATABASE_URL } = envConfig;
                execSync(`psql "${DATABASE_URL}" -f database/seed.sql`, { stdio: 'inherit' });
                matchRes = await fetch(`${baseUrl}/api/requests/match`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Cookie': customerCookie
                    },
                    body: JSON.stringify(matchPayload)
                });
                matchData = await matchRes.json();
            } catch (err) {
                console.error('Seed fallback execution error:', err.message);
            }
        }

        assert(Array.isArray(matchData.candidates) && matchData.candidates.length >= 1,
            'POST /api/requests/match returns candidates >= 1',
            'seed has no appliance-repair Saturday 16:00-18:00 coverage'
        );

        const firstCandidate = matchData.candidates[0];
        assert(firstCandidate && firstCandidate.provider && firstCandidate.provider.id, 'Candidate contains provider.id');
        assert(firstCandidate && firstCandidate.provider && firstCandidate.provider.price != null, 'Candidate contains provider.price');
        assert(firstCandidate && firstCandidate.score > 0, `Candidate score > 0 (score: ${firstCandidate ? firstCandidate.score : 0})`);
        assert(
            firstCandidate &&
            firstCandidate.breakdown &&
            firstCandidate.breakdown.distance >= 0 &&
            firstCandidate.breakdown.distance <= 1,
            'Candidate breakdown.distance between 0 and 1'
        );

        // Test 4: POST /api/requests/match without cookie -> 401
        const unauthMatchRes = await fetch(`${baseUrl}/api/requests/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(matchPayload)
        });
        assert(unauthMatchRes.status === 401, 'POST /api/requests/match without cookie returns 401');

        // Test 5: POST /api/requests/match with nonexistent category -> 404
        const invalidMatchRes = await fetch(`${baseUrl}/api/requests/match`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': customerCookie
            },
            body: JSON.stringify({ ...matchPayload, category_slug: 'nonexistent' })
        });
        assert(invalidMatchRes.status === 404, 'POST /api/requests/match with nonexistent category returns 404');

        // Test 6: POST /api/requests (FormData with provider_id)
        const chosenProviderId = firstCandidate.provider.id;
        const formData = new FormData();
        formData.append('category_slug', matchPayload.category_slug);
        formData.append('preferred_date', matchPayload.preferred_date);
        formData.append('preferred_start_minute', String(matchPayload.preferred_start_minute));
        formData.append('preferred_end_minute', String(matchPayload.preferred_end_minute));
        formData.append('urgency', matchPayload.urgency);
        formData.append('address', matchPayload.address);
        formData.append('latitude', String(matchPayload.latitude));
        formData.append('longitude', String(matchPayload.longitude));
        formData.append('provider_id', String(chosenProviderId));
        formData.append('description', 'Test automated booking');
        formData.append('contact_phone', '+8801700000001');

        // Include dummy image buffer to test multipart upload
        const testBlob = new Blob(['image-test-bytes'], { type: 'image/png' });
        formData.append('image', testBlob, 'photo.png');

        const createRes = await fetch(`${baseUrl}/api/requests`, {
            method: 'POST',
            headers: { 'Cookie': customerCookie },
            body: formData
        });

        assert(createRes.status === 200, `POST /api/requests returns 200 (status: ${createRes.status})`);
        const createData = await createRes.json();
        assert(createData.ok === true && createData.request && createData.request.id, 'POST /api/requests returns body.request.id');
        assert(
            createData.request && Number(createData.request.assigned_provider_id) === Number(chosenProviderId),
            'POST /api/requests assigns chosen provider_id'
        );

        createdRequestId = createData.request.id;

        // --------------------------------------------------------
        // 3. Database Persistence Assertions
        // --------------------------------------------------------
        console.log('\n--- 3. Database Persistence & Transaction Checks ---');
        pool = new Pool({ connectionString: envConfig.DATABASE_URL });

        const bookingCountRes = await pool.query(
            'SELECT COUNT(*)::int AS count FROM provider_bookings WHERE request_id = $1;',
            [createdRequestId]
        );
        assert(bookingCountRes.rows[0].count === 1, 'DB assertion: provider_bookings row exists for request (count === 1)');

        const eventCountRes = await pool.query(
            "SELECT COUNT(*)::int AS count FROM request_status_events WHERE request_id = $1 AND status = 'requested';",
            [createdRequestId]
        );
        assert(eventCountRes.rows[0].count === 1, "DB assertion: request_status_events has row with status='requested' (count === 1)");

        // Test 7: Double booking conflict -> 409
        console.log('\n--- 4. Conflict & List Assertions ---');
        const conflictFormData = new FormData();
        conflictFormData.append('category_slug', matchPayload.category_slug);
        conflictFormData.append('preferred_date', matchPayload.preferred_date);
        conflictFormData.append('preferred_start_minute', String(matchPayload.preferred_start_minute));
        conflictFormData.append('preferred_end_minute', String(matchPayload.preferred_end_minute));
        conflictFormData.append('urgency', matchPayload.urgency);
        conflictFormData.append('address', matchPayload.address);
        conflictFormData.append('provider_id', String(chosenProviderId));

        const conflictRes = await fetch(`${baseUrl}/api/requests`, {
            method: 'POST',
            headers: { 'Cookie': customerCookie },
            body: conflictFormData
        });

        assert(conflictRes.status === 409, `POST /api/requests duplicate slot returns 409 (status: ${conflictRes.status})`);
        const conflictData = await conflictRes.json();
        assert(conflictData.error && /slot/i.test(conflictData.error), 'Conflict response error message matches /slot/i');

        // Test 8: GET /api/requests/mine (authenticated)
        const mineRes = await fetch(`${baseUrl}/api/requests/mine`, {
            headers: { 'Cookie': customerCookie }
        });
        assert(mineRes.status === 200, 'GET /api/requests/mine with customer cookie returns 200');
        const mineData = await mineRes.json();
        assert(mineData.ok === true && Array.isArray(mineData.requests) && mineData.requests.length >= 1, 'GET /api/requests/mine returns requests array');
        const foundCreatedReq = mineData.requests.some(r => r.id === createdRequestId);
        assert(foundCreatedReq, 'GET /api/requests/mine contains the created request ID');

        // Test 9: GET /api/requests/mine without cookie -> 401
        const unauthMineRes = await fetch(`${baseUrl}/api/requests/mine`);
        assert(unauthMineRes.status === 401, 'GET /api/requests/mine without cookie returns 401');

        // Test 10: Static file check GET /uploads/ -> 200 or 404 (not 500)
        const uploadsRes = await fetch(`${baseUrl}/uploads/`);
        assert(uploadsRes.status === 200 || uploadsRes.status === 404, `Static route GET /uploads/ returns 200/404 (not 500, got ${uploadsRes.status})`);

        // Stop server
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
    // 5. Regression Checks
    // --------------------------------------------------------
    console.log('\n--- 5. Regression Suite Checks (Phases 0, 1, 2) ---');
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
