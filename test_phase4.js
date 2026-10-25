/**
 * Phase 4 Verification Test Suite — Slot-Based Scheduling + Concurrency Lock + UI Images
 *
 * Verifies:
 * 1. Static file and code assertions (scheduling service, providers routes, images.js, timezone parser, etc.).
 * 2. Integration HTTP assertions (provider slots, 404/400 handling, slot block, 409 suggestions).
 * 3. Timezone formatting check on preferred_date (YYYY-MM-DD string format).
 * 4. Concurrency lock test: Promise.all simultaneous bookings on identical slot.
 * 5. Image smoke test: HTTP status check on all 8 Unsplash category URLs.
 * 6. Regression checks: Phases 0, 1, 2, 3 test suites exit 0.
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
console.log('   PHASE 4: SCHEDULING, CONCURRENCY & UI IMAGES     ');
console.log('====================================================\n');

async function runTests() {
    // --------------------------------------------------------
    // 1. Static Assertions
    // --------------------------------------------------------
    console.log('--- 1. Static File & Code Structure Checks ---');

    const requiredFiles = [
        'server/services/scheduling.service.js',
        'server/routes/providers.routes.js',
        'client/js/images.js',
        'test_phase4.js'
    ];

    requiredFiles.forEach(file => {
        const fullPath = path.resolve(__dirname, file);
        assert(fs.existsSync(fullPath), `Required file exists: ${file}`);
    });

    const schedulingContent = fs.readFileSync(path.resolve(__dirname, 'server/services/scheduling.service.js'), 'utf8');
    assert(schedulingContent.includes('getSlots'), 'scheduling.service.js contains getSlots');
    assert(schedulingContent.includes('getSuggestions'), 'scheduling.service.js contains getSuggestions');
    assert(schedulingContent.includes('isSlotAvailable'), 'scheduling.service.js contains isSlotAvailable');

    const reqCtrlContent = fs.readFileSync(path.resolve(__dirname, 'server/controllers/requests.controller.js'), 'utf8');
    assert(reqCtrlContent.includes('pg_advisory_xact_lock'), 'requests.controller.js contains pg_advisory_xact_lock');
    assert(reqCtrlContent.includes('suggestions'), 'requests.controller.js contains suggestions');
    assert(reqCtrlContent.includes('23505'), 'requests.controller.js contains 23505');

    const dbConfigContent = fs.readFileSync(path.resolve(__dirname, 'server/config/db.js'), 'utf8');
    assert(dbConfigContent.includes('setTypeParser'), 'db.js contains setTypeParser');
    assert(dbConfigContent.includes('1082'), 'db.js contains 1082 (date parser)');

    const imagesJsContent = fs.readFileSync(path.resolve(__dirname, 'client/js/images.js'), 'utf8');
    const expectedSlugs = [
        'appliance-repair', 'plumbing', 'electrical', 'cleaning-pest',
        'home-maintenance', 'moving-shifting', 'car-care', 'personal-care'
    ];
    const allSlugsPresent = expectedSlugs.every(s => imagesJsContent.includes(`'${s}'`));
    assert(allSlugsPresent, 'client/js/images.js contains all 8 category slugs');

    const indexHtmlContent = fs.readFileSync(path.resolve(__dirname, 'client/index.html'), 'utf8');
    assert(indexHtmlContent.includes('IMAGES.category('), 'client/index.html contains IMAGES.category(');
    assert(indexHtmlContent.includes('card-img-top'), 'client/index.html contains card-img-top');

    const reqHtmlContent = fs.readFileSync(path.resolve(__dirname, 'client/request.html'), 'utf8');
    assert(reqHtmlContent.includes('/api/providers/'), 'client/request.html contains /api/providers/ (slot fetch)');

    const reqJsContent = fs.readFileSync(path.resolve(__dirname, 'client/js/request.js'), 'utf8');
    assert(reqJsContent.includes('suggestions'), 'client/js/request.js contains suggestions');

    const serverIndexContent = fs.readFileSync(path.resolve(__dirname, 'server/index.js'), 'utf8');
    assert(serverIndexContent.includes('/api/providers'), 'server/index.js mounts /api/providers');

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

        // Clean any leftover test bookings from prior runs
        await pool.query("DELETE FROM provider_bookings WHERE request_id IN (SELECT id FROM service_requests WHERE address LIKE '%__phase4_test_%' OR description LIKE '%__phase4_test_%');");
        await pool.query("DELETE FROM request_status_events WHERE request_id IN (SELECT id FROM service_requests WHERE address LIKE '%__phase4_test_%' OR description LIKE '%__phase4_test_%');");
        await pool.query("DELETE FROM service_requests WHERE address LIKE '%__phase4_test_%' OR description LIKE '%__phase4_test_%';");

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

        // Wait for health check
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

        // Customer login
        const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
        });
        assert(loginRes.status === 200, 'Customer login returns 200');
        const rawCookie = loginRes.headers.get('set-cookie') || '';
        const customerCookie = rawCookie.split(';')[0];
        assert(customerCookie.includes('hutfix_token'), 'Customer login sets hutfix_token cookie');

        const testDate = getNextSaturday();
        console.log(`Testing with date: ${testDate}`);

        // Test 1: GET /api/providers/2/slots?date=<next Saturday>&category_slug=appliance-repair
        const slotsRes = await fetch(`${baseUrl}/api/providers/2/slots?date=${testDate}&category_slug=appliance-repair`);
        assert(slotsRes.status === 200, 'GET /api/providers/2/slots returns 200');
        const slotsData = await slotsRes.json();
        assert(slotsData.ok === true, 'Slots response ok === true');
        assert(Array.isArray(slotsData.slots) && slotsData.slots.length >= 1, `Slots array length >= 1 (got ${slotsData.slots ? slotsData.slots.length : 0})`);

        const firstSlot = slotsData.slots ? slotsData.slots[0] : null;
        assert(
            firstSlot &&
            firstSlot.start_minute != null &&
            firstSlot.end_minute != null &&
            firstSlot.available != null &&
            typeof firstSlot.label === 'string',
            'Each slot has start_minute, end_minute, available, and label'
        );

        // Test 2: GET /api/providers/999/slots -> 404
        const missingProviderRes = await fetch(`${baseUrl}/api/providers/999/slots?date=${testDate}&category_slug=appliance-repair`);
        assert(missingProviderRes.status === 404, 'GET /api/providers/999/slots returns 404');

        // Test 3: GET /api/providers/2/slots without date -> 400
        const missingDateRes = await fetch(`${baseUrl}/api/providers/2/slots?category_slug=appliance-repair`);
        assert(missingDateRes.status === 400, 'GET /api/providers/2/slots without date returns 400');

        // Test 4: Slot block test
        // Pick first available slot for provider 2
        const availableSlot = slotsData.slots.find(s => s.available);
        assert(availableSlot != null, 'Found an available slot for provider 2');

        const testAddress1 = 'Dhanmondi Road 5 __phase4_test_block__';
        const blockFormData = new FormData();
        blockFormData.append('category_slug', 'appliance-repair');
        blockFormData.append('preferred_date', testDate);
        blockFormData.append('preferred_start_minute', String(availableSlot.start_minute));
        blockFormData.append('preferred_end_minute', String(availableSlot.end_minute));
        blockFormData.append('urgency', 'normal');
        blockFormData.append('address', testAddress1);
        blockFormData.append('provider_id', '2');
        blockFormData.append('description', '__phase4_test_ block request');

        const blockRes = await fetch(`${baseUrl}/api/requests`, {
            method: 'POST',
            headers: { Cookie: customerCookie },
            body: blockFormData
        });
        assert(blockRes.status === 200, `POST /api/requests booking available slot returns 200 (got ${blockRes.status})`);

        // Fetch slots again: that slot must now be available === false
        const refreshedSlotsRes = await fetch(`${baseUrl}/api/providers/2/slots?date=${testDate}&category_slug=appliance-repair`);
        const refreshedSlotsData = await refreshedSlotsRes.json();
        const checkedSlot = refreshedSlotsData.slots.find(s => s.start_minute === availableSlot.start_minute);
        assert(checkedSlot && checkedSlot.available === false, 'Booked slot now has available === false');

        // Test 5: Conflict test with suggestions
        const conflictRes = await fetch(`${baseUrl}/api/requests`, {
            method: 'POST',
            headers: { Cookie: customerCookie },
            body: blockFormData
        });
        assert(conflictRes.status === 409, `POST /api/requests duplicate slot returns 409 (got ${conflictRes.status})`);
        const conflictData = await conflictRes.json();
        assert(conflictData.error && /slot/i.test(conflictData.error), 'Conflict error message matches /slot/i');
        assert(Array.isArray(conflictData.suggestions) && conflictData.suggestions.length >= 0, 'Conflict response contains suggestions array');

        // Test 6: Timezone regression test on GET /api/requests/mine
        const mineRes = await fetch(`${baseUrl}/api/requests/mine`, {
            headers: { Cookie: customerCookie }
        });
        assert(mineRes.status === 200, 'GET /api/requests/mine returns 200');
        const mineData = await mineRes.json();
        assert(Array.isArray(mineData.requests) && mineData.requests.length >= 1, 'GET /api/requests/mine returns requests');
        const allPreferredDatesClean = mineData.requests.every(r => /^\d{4}-\d{2}-\d{2}$/.test(r.preferred_date));
        assert(allPreferredDatesClean, 'Each preferred_date in /api/requests/mine matches /^\d{4}-\d{2}-\d{2}$/ (no T, no Z)');

        // Test 7: Concurrency lock test
        // Find another slot that is still available
        const remainingSlot = refreshedSlotsData.slots.find(s => s.available);
        assert(remainingSlot != null, 'Found an available slot for concurrency testing');

        const concurrentDate = testDate;
        const concurrentStart = remainingSlot.start_minute;
        const concurrentEnd = remainingSlot.end_minute;

        const cFd1 = new FormData();
        cFd1.append('category_slug', 'appliance-repair');
        cFd1.append('preferred_date', concurrentDate);
        cFd1.append('preferred_start_minute', String(concurrentStart));
        cFd1.append('preferred_end_minute', String(concurrentEnd));
        cFd1.append('urgency', 'normal');
        cFd1.append('address', 'Dhanmondi Road 8 __phase4_test_concurrent_A__');
        cFd1.append('provider_id', '2');
        cFd1.append('description', '__phase4_test_ concurrent A');

        const cFd2 = new FormData();
        cFd2.append('category_slug', 'appliance-repair');
        cFd2.append('preferred_date', concurrentDate);
        cFd2.append('preferred_start_minute', String(concurrentStart));
        cFd2.append('preferred_end_minute', String(concurrentEnd));
        cFd2.append('urgency', 'normal');
        cFd2.append('address', 'Dhanmondi Road 8 __phase4_test_concurrent_B__');
        cFd2.append('provider_id', '2');
        cFd2.append('description', '__phase4_test_ concurrent B');

        const [cRes1, cRes2] = await Promise.all([
            fetch(`${baseUrl}/api/requests`, { method: 'POST', headers: { Cookie: customerCookie }, body: cFd1 }),
            fetch(`${baseUrl}/api/requests`, { method: 'POST', headers: { Cookie: customerCookie }, body: cFd2 })
        ]);

        const statuses = [cRes1.status, cRes2.status].sort();
        assert(statuses[0] === 200 && statuses[1] === 409, `Concurrency test: exactly one 200 and one 409 (got ${statuses.join(', ')})`);

        // Assert DB has exactly one provider_bookings row for this provider, date, start_minute
        const concurrentDbCheck = await pool.query(
            'SELECT COUNT(*)::int AS count FROM provider_bookings WHERE provider_id = 2 AND slot_date = $1 AND start_minute = $2;',
            [concurrentDate, concurrentStart]
        );
        assert(concurrentDbCheck.rows[0].count === 1, 'DB assertion: exactly one provider_bookings row exists for contested slot (count === 1)');

        // Test 8: Image smoke test (verify 200 <= status < 400 for all 8 URLs)
        console.log('\n--- 3. Image URLs Smoke Test ---');
        const categoryUrls = {
            'appliance-repair':  'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&auto=format&fit=crop&q=70',
            'plumbing':          'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=800&auto=format&fit=crop&q=70',
            'electrical':        'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800&auto=format&fit=crop&q=70',
            'cleaning-pest':     'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&auto=format&fit=crop&q=70',
            'home-maintenance':  'https://images.unsplash.com/photo-1581141849291-1125c7b692b5?w=800&auto=format&fit=crop&q=70',
            'moving-shifting':   'https://images.unsplash.com/photo-1600518464441-9154a4dea21b?w=800&auto=format&fit=crop&q=70',
            'car-care':          'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&auto=format&fit=crop&q=70',
            'personal-care':     'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=70'
        };

        for (const [slug, url] of Object.entries(categoryUrls)) {
            try {
                const imgRes = await fetch(url, { method: 'HEAD' });
                assert(imgRes.status >= 200 && imgRes.status < 400, `Image smoke for [${slug}] returns status ${imgRes.status}`);
            } catch (err) {
                assert(false, `Image smoke for [${slug}] failed: ${err.message}`);
            }
        }

        // Cleanup test data
        await pool.query("DELETE FROM provider_bookings WHERE request_id IN (SELECT id FROM service_requests WHERE address LIKE '%__phase4_test_%' OR description LIKE '%__phase4_test_%');");
        await pool.query("DELETE FROM request_status_events WHERE request_id IN (SELECT id FROM service_requests WHERE address LIKE '%__phase4_test_%' OR description LIKE '%__phase4_test_%');");
        await pool.query("DELETE FROM service_requests WHERE address LIKE '%__phase4_test_%' OR description LIKE '%__phase4_test_%';");

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
    // 4. Regression Suite Checks (Phases 0, 1, 2, 3)
    // --------------------------------------------------------
    console.log('\n--- 4. Regression Suite Checks (Phases 0, 1, 2, 3) ---');
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
