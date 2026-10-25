/**
 * Phase 6 Verification Test Suite — Bonus Layer & Documentation Protocol
 *
 * Verifies:
 * 1. Static file and code assertions (notifications, invoices, ratings, matching busy-day filter, UI components).
 * 2. Documentation presence and mandatory markers (ARCHITECTURE, DATABASE, API, UI, DEMO, CHANGELOG, ROADMAP, README).
 * 3. Integration flow (Request -> Accept -> On the way -> In progress -> Completed -> Invoice auto-gen -> Rating -> Provider aggregate update).
 * 4. Notifications feed, mark read, mark all read.
 * 5. Matching busy-day filter capping provider workload at >= 4 bookings.
 * 6. Regressions: test_phase0.js, test_phase1.js, test_phase2.js, test_phase3.js, test_phase4.js, test_phase5.js exit 0.
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
console.log('   PHASE 6: BONUS LAYER & DOCUMENTATION PROTOCOL    ');
console.log('====================================================\n');

async function runTests() {
    // --------------------------------------------------------
    // 1. Static Assertions
    // --------------------------------------------------------
    console.log('--- 1. Static File & Code Structure Checks ---');

    const requiredFiles = [
        'database/migrations/001_add_notifications.sql',
        'server/services/notifications.service.js',
        'server/controllers/invoices.controller.js',
        'server/controllers/ratings.controller.js',
        'server/controllers/notifications.controller.js',
        'server/routes/invoices.routes.js',
        'server/routes/ratings.routes.js',
        'server/routes/notifications.routes.js',
        'client/invoice.html',
        'test_phase6.js'
    ];

    requiredFiles.forEach(file => {
        const fullPath = path.resolve(__dirname, file);
        assert(fs.existsSync(fullPath), `Required file exists: ${file}`);
    });

    const schemaContent = fs.readFileSync(path.resolve(__dirname, 'database/schema.sql'), 'utf8');
    assert(schemaContent.includes('notifications'), 'database/schema.sql contains notifications');

    const migrationContent = fs.readFileSync(path.resolve(__dirname, 'database/migrations/001_add_notifications.sql'), 'utf8');
    assert(migrationContent.includes('CREATE TABLE IF NOT EXISTS notifications'), '001_add_notifications.sql contains CREATE TABLE IF NOT EXISTS notifications');

    const matchingServiceContent = fs.readFileSync(path.resolve(__dirname, 'server/services/matching.service.js'), 'utf8');
    const hasBusyFilter = matchingServiceContent.includes('>= 4') || matchingServiceContent.includes('>=4');
    assert(hasBusyFilter, 'server/services/matching.service.js contains >= 4 or >=4 (busy-day filter)');

    const serverIndexContent = fs.readFileSync(path.resolve(__dirname, 'server/index.js'), 'utf8');
    assert(serverIndexContent.includes('/api/invoices'), 'server/index.js mounts /api/invoices');
    assert(serverIndexContent.includes('/api/ratings'), 'server/index.js mounts /api/ratings');
    assert(serverIndexContent.includes('/api/notifications'), 'server/index.js mounts /api/notifications');

    const trackingHtmlContent = fs.readFileSync(path.resolve(__dirname, 'client/tracking.html'), 'utf8');
    assert(trackingHtmlContent.includes('id="notif-bell"'), 'client/tracking.html contains id="notif-bell"');
    assert(trackingHtmlContent.includes('id="notif-count"'), 'client/tracking.html contains id="notif-count"');

    const providerHtmlContent = fs.readFileSync(path.resolve(__dirname, 'client/provider.html'), 'utf8');
    assert(providerHtmlContent.includes('id="notif-bell"'), 'client/provider.html contains id="notif-bell"');

    const invoiceHtmlContent = fs.readFileSync(path.resolve(__dirname, 'client/invoice.html'), 'utf8');
    assert(invoiceHtmlContent.includes('window.print'), 'client/invoice.html contains window.print');

    // Docs checks
    console.log('\n--- 2. Documentation Protocol & Markers Checks ---');
    const archContent = fs.readFileSync(path.resolve(__dirname, 'docs/ARCHITECTURE.md'), 'utf8');
    assert(archContent.includes('Matching'), 'docs/ARCHITECTURE.md contains Matching');
    assert(archContent.includes('Scheduling'), 'docs/ARCHITECTURE.md contains Scheduling');
    assert(archContent.includes('Lifecycle'), 'docs/ARCHITECTURE.md contains Lifecycle');
    assert(archContent.includes('Portability'), 'docs/ARCHITECTURE.md contains Portability');

    const dbDocContent = fs.readFileSync(path.resolve(__dirname, 'docs/DATABASE.md'), 'utf8');
    const expectedTables = [
        'users', 'service_categories', 'providers', 'service_requests',
        'notifications', 'invoices', 'ratings', 'provider_bookings',
        'request_status_events', 'provider_services', 'provider_availability'
    ];
    expectedTables.forEach(tbl => {
        assert(dbDocContent.includes(tbl), `docs/DATABASE.md covers table: ${tbl}`);
    });

    const apiDocContent = fs.readFileSync(path.resolve(__dirname, 'docs/API.md'), 'utf8');
    const apiEndpoints = [
        '/api/auth/login', '/api/services', '/api/providers/',
        '/api/requests', '/api/invoices', '/api/ratings',
        '/api/notifications', '/api/health'
    ];
    apiEndpoints.forEach(ep => {
        assert(apiDocContent.includes(ep), `docs/API.md covers endpoint: ${ep}`);
    });

    const uiDocContent = fs.readFileSync(path.resolve(__dirname, 'docs/UI.md'), 'utf8');
    const expectedPages = ['index.html', 'login.html', 'request.html', 'tracking.html', 'provider.html', 'invoice.html'];
    expectedPages.forEach(p => {
        assert(uiDocContent.includes(p), `docs/UI.md covers page: ${p}`);
    });

    const demoDocContent = fs.readFileSync(path.resolve(__dirname, 'docs/DEMO.md'), 'utf8');
    assert(demoDocContent.includes('customer@demo.test'), 'docs/DEMO.md contains customer@demo.test');
    assert(demoDocContent.includes('provider@demo.test'), 'docs/DEMO.md contains provider@demo.test');

    const changelogDocContent = fs.readFileSync(path.resolve(__dirname, 'docs/CHANGELOG.md'), 'utf8');
    assert(changelogDocContent.includes('Phase 0'), 'docs/CHANGELOG.md contains Phase 0');
    assert(changelogDocContent.includes('Phase 6'), 'docs/CHANGELOG.md contains Phase 6');

    const roadmapDocContent = fs.readFileSync(path.resolve(__dirname, 'docs/ROADMAP.md'), 'utf8');
    assert(roadmapDocContent.includes('Phase 7'), 'docs/ROADMAP.md contains Phase 7');

    const readmeContent = fs.readFileSync(path.resolve(__dirname, 'README.md'), 'utf8');
    assert(readmeContent.includes('HutFix'), 'README.md contains HutFix');
    assert(readmeContent.includes('Quick start'), 'README.md contains Quick start');
    assert(readmeContent.includes('demo1234'), 'README.md contains demo1234');
    assert(readmeContent.includes('docs/ARCHITECTURE.md'), 'README.md contains docs/ARCHITECTURE.md');

    // --------------------------------------------------------
    // 3. Integration Assertions (HTTP against running server)
    // --------------------------------------------------------
    console.log('\n--- 3. Integration HTTP Checks (Spawn Server) ---');
    const envConfig = require('./server/config/env');
    const port = envConfig.PORT || 3000;
    const baseUrl = `http://localhost:${port}`;

    let pool = null;

    try {
        pool = new Pool({ connectionString: envConfig.DATABASE_URL });

        // Database cleanup function for phase 6 markers
        async function cleanupPhase6() {
            await pool.query(`
                DELETE FROM notifications WHERE request_id IN (
                    SELECT id FROM service_requests WHERE address LIKE '%__phase6_test_%'
                );
            `);
            await pool.query(`
                DELETE FROM ratings WHERE request_id IN (
                    SELECT id FROM service_requests WHERE address LIKE '%__phase6_test_%'
                );
            `);
            await pool.query(`
                DELETE FROM invoices WHERE request_id IN (
                    SELECT id FROM service_requests WHERE address LIKE '%__phase6_test_%'
                );
            `);
            await pool.query(`
                DELETE FROM request_status_events WHERE request_id IN (
                    SELECT id FROM service_requests WHERE address LIKE '%__phase6_test_%'
                );
            `);
            await pool.query(`
                DELETE FROM provider_bookings WHERE request_id IN (
                    SELECT id FROM service_requests WHERE address LIKE '%__phase6_test_%'
                );
            `);
            await pool.query("DELETE FROM service_requests WHERE address LIKE '%__phase6_test_%';");
            await pool.query("UPDATE providers SET rating = 4.8, rating_count = 115 WHERE id = 2;");
        }

        // Run initial cleanup
        await cleanupPhase6();

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

        // Wait for server ready
        let serverReady = false;
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 200));
            try {
                const res = await fetch(`${baseUrl}/api/health`);
                if (res.ok) {
                    serverReady = true;
                    break;
                }
            } catch (_) {}
        }
        assert(serverReady, 'Dev server spawned and healthy on /api/health');

        // Helper cookie parser
        function extractCookie(res) {
            const setCookie = res.headers.get('set-cookie');
            if (!setCookie) return null;
            return setCookie.split(';')[0].trim();
        }

        // Login Customer
        const custLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
        });
        const custCookie = extractCookie(custLoginRes);
        assert(custLoginRes.status === 200 && custCookie, 'Customer login succeeded with cookie');

        // Login Provider 2 (user_id = 4, email = provider1@demo.test)
        const provLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'provider1@demo.test', password: 'demo1234' })
        });
        const provCookie = extractCookie(provLoginRes);
        assert(provLoginRes.status === 200 && provCookie, 'Provider 2 login succeeded with cookie');

        // Record initial rating_count for provider 2
        const initProvRes = await pool.query('SELECT rating, rating_count FROM providers WHERE id = 2;');
        const initRatingCount = parseInt(initProvRes.rows[0].rating_count, 10) || 0;

        // Create Request with provider_id=2
        const targetSaturday = getNextSaturday();
        const createBoundary = '----Phase6TestBoundary' + Date.now();
        const multipartBody = [
            `--${createBoundary}`,
            'Content-Disposition: form-data; name="category_slug"',
            '',
            'appliance-repair',
            `--${createBoundary}`,
            'Content-Disposition: form-data; name="provider_id"',
            '',
            '2',
            `--${createBoundary}`,
            'Content-Disposition: form-data; name="preferred_date"',
            '',
            targetSaturday,
            `--${createBoundary}`,
            'Content-Disposition: form-data; name="preferred_start_minute"',
            '',
            '600',
            `--${createBoundary}`,
            'Content-Disposition: form-data; name="preferred_end_minute"',
            '',
            '660',
            `--${createBoundary}`,
            'Content-Disposition: form-data; name="address"',
            '',
            '__phase6_test_complete Dhanmondi Road 27',
            `--${createBoundary}`,
            'Content-Disposition: form-data; name="urgency"',
            '',
            'normal',
            `--${createBoundary}--`,
            ''
        ].join('\r\n');

        const createRes = await fetch(`${baseUrl}/api/requests`, {
            method: 'POST',
            headers: {
                'Content-Type': `multipart/form-data; boundary=${createBoundary}`,
                'Cookie': custCookie
            },
            body: multipartBody
        });
        const createData = await createRes.json();
        assert(createRes.status === 200 && createData.ok && createData.request, 'Request created via multipart (provider_id=2)');
        const reqId = createData.request?.id;

        // Provider notifications after request creation
        const provNotifRes1 = await fetch(`${baseUrl}/api/notifications`, {
            headers: { 'Cookie': provCookie }
        });
        const provNotifData1 = await provNotifRes1.json();
        assert(
            provNotifData1.ok && provNotifData1.notifications.length >= 1 &&
            provNotifData1.notifications.some(n => n.kind === 'request_created' || n.kind === 'request_cancelled'),
            'Provider notification received for request_created'
        );

        // Provider lifecycle transitions
        const acceptRes = await fetch(`${baseUrl}/api/requests/${reqId}/accept`, {
            method: 'POST',
            headers: { 'Cookie': provCookie }
        });
        const acceptData = await acceptRes.json();
        assert(acceptRes.status === 200 && acceptData.ok && acceptData.request.status === 'accepted', 'Provider accept returned 200 and accepted');

        const onTheWayRes = await fetch(`${baseUrl}/api/requests/${reqId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Cookie': provCookie },
            body: JSON.stringify({ status: 'on_the_way' })
        });
        assert(onTheWayRes.status === 200, 'Provider advance to on_the_way returned 200');

        const inProgressRes = await fetch(`${baseUrl}/api/requests/${reqId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Cookie': provCookie },
            body: JSON.stringify({ status: 'in_progress' })
        });
        assert(inProgressRes.status === 200, 'Provider advance to in_progress returned 200');

        const completeRes = await fetch(`${baseUrl}/api/requests/${reqId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Cookie': provCookie },
            body: JSON.stringify({ status: 'completed' })
        });
        assert(completeRes.status === 200, 'Provider advance to completed returned 200');

        // Invoice auto-generated
        const invoiceRes = await fetch(`${baseUrl}/api/invoices/by-request/${reqId}`, {
            headers: { 'Cookie': custCookie }
        });
        const invoiceData = await invoiceRes.json();
        assert(invoiceRes.status === 200 && invoiceData.ok && invoiceData.invoice, 'GET /api/invoices/by-request/:id returned 200');
        const inv = invoiceData.invoice;
        const sub = parseFloat(inv.subtotal);
        const expectedTax = Math.round(sub * 0.05 * 100) / 100;
        assert(parseFloat(inv.total) > 0, 'Invoice total > 0');
        assert(parseFloat(inv.tax) === expectedTax, `Invoice tax matches round(subtotal * 0.05): ${inv.tax}`);
        assert(inv.currency === 'BDT', 'Invoice currency is BDT');

        // Invoice access control: fresh customer gets 403
        const freshEmail = `fresh_cust_${Date.now()}@demo.test`;
        const regRes = await fetch(`${baseUrl}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: freshEmail, password: 'demo1234', full_name: 'Fresh Customer', role: 'customer' })
        });
        const freshLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: freshEmail, password: 'demo1234' })
        });
        const freshCookie = extractCookie(freshLoginRes);
        const unauthInvRes = await fetch(`${baseUrl}/api/invoices/by-request/${reqId}`, {
            headers: { 'Cookie': freshCookie }
        });
        assert(unauthInvRes.status === 403, 'Invoice access control returned 403 for unauthorized customer');

        // Rate the service
        const rateRes = await fetch(`${baseUrl}/api/ratings/by-request/${reqId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': custCookie },
            body: JSON.stringify({ stars: 5, comment: '__phase6_test__ great work' })
        });
        const rateData = await rateRes.json();
        assert(rateRes.status === 200 && rateData.ok && rateData.rating.stars === 5, 'Customer rating returned 200 with stars === 5');

        // Rate twice -> 409
        const rateTwiceRes = await fetch(`${baseUrl}/api/ratings/by-request/${reqId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': custCookie },
            body: JSON.stringify({ stars: 4, comment: 'second try' })
        });
        const rateTwiceData = await rateTwiceRes.json();
        assert(rateTwiceRes.status === 409 && /already/i.test(rateTwiceData.error), 'Rate twice returned 409 already rated');

        // Rate non-completed request -> 400
        const uncompletedReqRes = await fetch(`${baseUrl}/api/requests`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': custCookie },
            body: JSON.stringify({
                category_slug: 'appliance-repair',
                preferred_date: targetSaturday,
                preferred_start_minute: 720,
                preferred_end_minute: 780,
                address: '__phase6_test_noncompleted'
            })
        });
        const uncompletedReqData = await uncompletedReqRes.json();
        const uncompletedId = uncompletedReqData.request?.id;
        const rateUncompletedRes = await fetch(`${baseUrl}/api/ratings/by-request/${uncompletedId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': custCookie },
            body: JSON.stringify({ stars: 5 })
        });
        const rateUncompletedData = await rateUncompletedRes.json();
        assert(rateUncompletedRes.status === 400 && /completed/i.test(rateUncompletedData.error), 'Rate non-completed request returned 400 completed check');

        // Provider aggregate updated in DB
        const updatedProvRes = await pool.query('SELECT rating_count FROM providers WHERE id = 2;');
        const updatedCount = parseInt(updatedProvRes.rows[0].rating_count, 10);
        assert(updatedCount === initRatingCount + 1, `Provider rating_count incremented from ${initRatingCount} to ${updatedCount}`);

        // Notifications fire for customer
        const custNotifRes = await fetch(`${baseUrl}/api/notifications`, {
            headers: { 'Cookie': custCookie }
        });
        const custNotifData = await custNotifRes.json();
        assert(
            custNotifData.ok && custNotifData.notifications.length >= 1 &&
            custNotifData.notifications.some(n => n.kind === 'request_accepted' || n.kind === 'invoice_issued'),
            'Customer notifications include request_accepted or invoice_issued'
        );
        assert(custNotifData.unread_count >= 1, `Customer unread_count >= 1 (got ${custNotifData.unread_count})`);

        // Mark single notification read
        const firstUnread = custNotifData.notifications.find(n => !n.is_read);
        assert(firstUnread != null, 'Found an unread notification');
        const markReadRes = await fetch(`${baseUrl}/api/notifications/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': custCookie },
            body: JSON.stringify({ id: firstUnread.id })
        });
        assert(markReadRes.status === 200, 'POST /api/notifications/read returned 200');

        const custNotifResAfter1 = await fetch(`${baseUrl}/api/notifications`, {
            headers: { 'Cookie': custCookie }
        });
        const custNotifDataAfter1 = await custNotifResAfter1.json();
        assert(
            custNotifDataAfter1.unread_count === custNotifData.unread_count - 1,
            'Unread count decreased by 1 after markRead'
        );

        // Mark all read
        const markAllRes = await fetch(`${baseUrl}/api/notifications/read-all`, {
            method: 'POST',
            headers: { 'Cookie': custCookie }
        });
        const markAllData = await markAllRes.json();
        assert(markAllRes.status === 200 && markAllData.ok, 'POST /api/notifications/read-all returned 200');

        const custNotifResAfterAll = await fetch(`${baseUrl}/api/notifications`, {
            headers: { 'Cookie': custCookie }
        });
        const custNotifDataAfterAll = await custNotifResAfterAll.json();
        assert(custNotifDataAfterAll.unread_count === 0, 'Unread count is 0 after markAllRead');

        // Request detail includes invoice + rating
        const getOneRes = await fetch(`${baseUrl}/api/requests/${reqId}`, {
            headers: { 'Cookie': custCookie }
        });
        const getOneData = await getOneRes.json();
        assert(
            getOneRes.status === 200 && getOneData.invoice !== null && getOneData.rating !== null,
            'GET /api/requests/:id includes invoice and rating'
        );

        // Busy-day filter: pre-book 4 slots for provider 2 on next Saturday
        console.log('\n--- 4. Busy-day Workload Filter Verification ---');
        // Let's create and accept 4 requests for provider 2 on a distinct future Saturday
        const futureSaturday = '2026-11-28';
        const busySlots = [
            { start: 540, end: 600 },
            { start: 600, end: 660 },
            { start: 660, end: 720 },
            { start: 720, end: 780 }
        ];

        for (let idx = 0; idx < 4; idx++) {
            const slot = busySlots[idx];
            const busyReqRes = await fetch(`${baseUrl}/api/requests`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Cookie': custCookie },
                body: JSON.stringify({
                    category_slug: 'appliance-repair',
                    provider_id: 2,
                    preferred_date: futureSaturday,
                    preferred_start_minute: slot.start,
                    preferred_end_minute: slot.end,
                    address: `__phase6_test_busy_${idx}`
                })
            });
            const busyReqData = await busyReqRes.json();
            const bId = busyReqData.request?.id;
            if (bId) {
                await fetch(`${baseUrl}/api/requests/${bId}/accept`, {
                    method: 'POST',
                    headers: { 'Cookie': provCookie }
                });
            }
        }

        // Now test matching for that Saturday
        const matchRes = await fetch(`${baseUrl}/api/requests/match`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Cookie': custCookie },
            body: JSON.stringify({
                category_slug: 'appliance-repair',
                preferred_date: futureSaturday,
                preferred_start_minute: 780,
                preferred_end_minute: 840,
                address: 'Dhanmondi, Dhaka'
            })
        });
        const matchData = await matchRes.json();
        assert(matchRes.status === 200 && matchData.ok, 'POST /api/requests/match returned 200');
        const candidates = matchData.candidates || [];
        const provider2Excluded = candidates.every(c => String(c.provider.id) !== '2');
        assert(provider2Excluded, 'Provider 2 excluded by busy-day filter (>= 4 bookings)');

        // Idempotent Cleanup
        await cleanupPhase6();
        serverProc.kill();
        await pool.end();
    } catch (err) {
        console.error('Integration test exception:', err);
        assert(false, 'Integration suite ran without exceptions', err.message);
        if (pool) await pool.end().catch(() => {});
    }

    // --------------------------------------------------------
    // 5. Run Regressions (Phases 0, 1, 2, 3, 4, 5)
    // --------------------------------------------------------
    console.log('\n--- 5. Running Regression Suites (Phases 0-5) ---');
    const regressions = ['test_phase0.js', 'test_phase1.js', 'test_phase2.js', 'test_phase3.js', 'test_phase4.js', 'test_phase5.js'];

    for (const reg of regressions) {
        try {
            console.log(`Running regression: ${reg}...`);
            execSync(`node ${reg}`, { stdio: 'inherit', cwd: __dirname });
            assert(true, `Regression suite ${reg} exited 0`);
        } catch (err) {
            assert(false, `Regression suite ${reg} failed`, err.message);
        }
    }

    // Final summary
    console.log('\n====================================================');
    console.log(`PHASE 6 TEST RESULTS: PASS ${passCount} / FAIL ${failCount} / SKIP ${skipCount}`);
    console.log('====================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTests();
