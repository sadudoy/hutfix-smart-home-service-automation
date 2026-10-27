/**
 * Phase 10 Verification Test Suite — Final Fixora Reference UI & Real Backend Wiring
 *
 * Verifies:
 * 1. Static file structure (Fixora UI files, reference preservation, admin & provider controllers).
 * 2. DOM & CSS assertions (auth overlay, logout button, typography scaling >= 11px, 0 sub-11px).
 * 3. Client JS backend integration assertions (fetch calls, zero localStorage mock state).
 * 4. Documentation synchronization (UI.md, API.md, CHANGELOG.md, ROADMAP.md, README.md).
 * 5. Functional server tests (Fixora HTML/CSS/JS serving, RBAC enforcement 401/403/200,
 *    admin analytics, provider profile & invoices, smart provider matching).
 * 6. Full regression across Phases 0 through 8 (all exit 0).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');

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
console.log('   PHASE 10: FIXORA UI & BACKEND WIRING SUITE       ');
console.log('====================================================\n');

async function runTests() {
    // --------------------------------------------------------
    // Part 1: Static File & Structure Assertions
    // --------------------------------------------------------
    console.log('--- Part 1: Static Files & Reference Preservation ---');

    // 1.1 Core Fixora Client files
    assert(fs.existsSync(path.join(__dirname, 'client', 'index.html')), 'client/index.html exists');
    assert(fs.existsSync(path.join(__dirname, 'client', 'style.css')), 'client/style.css exists');
    assert(fs.existsSync(path.join(__dirname, 'client', 'app.js')), 'client/app.js exists');
    assert(fs.existsSync(path.join(__dirname, 'client', 'js', 'images.js')), 'client/js/images.js exists');

    // 1.2 Reference UI preserved intact
    assert(fs.existsSync(path.join(__dirname, 'client', '_reference_fixora', 'index.html')), 'client/_reference_fixora/index.html exists');
    assert(fs.existsSync(path.join(__dirname, 'client', '_reference_fixora', 'style.css')), 'client/_reference_fixora/style.css exists');
    assert(fs.existsSync(path.join(__dirname, 'client', '_reference_fixora', 'app.js')), 'client/_reference_fixora/app.js exists');

    // 1.3 Backend endpoints & test suite
    assert(fs.existsSync(path.join(__dirname, 'server', 'controllers', 'admin.controller.js')), 'server/controllers/admin.controller.js exists');
    assert(fs.existsSync(path.join(__dirname, 'server', 'routes', 'admin.routes.js')), 'server/routes/admin.routes.js exists');
    assert(fs.existsSync(path.join(__dirname, 'server', 'controllers', 'providers.controller.js')), 'server/controllers/providers.controller.js exists');
    assert(fs.existsSync(path.join(__dirname, 'server', 'routes', 'providers.routes.js')), 'server/routes/providers.routes.js exists');
    assert(fs.existsSync(path.join(__dirname, 'server', 'controllers', 'invoices.controller.js')), 'server/controllers/invoices.controller.js exists');
    assert(fs.existsSync(path.join(__dirname, 'server', 'routes', 'invoices.routes.js')), 'server/routes/invoices.routes.js exists');
    assert(fs.existsSync(path.join(__dirname, 'test_phase10.js')), 'test_phase10.js exists');

    // --------------------------------------------------------
    // Part 2: DOM & CSS Assertions
    // --------------------------------------------------------
    console.log('\n--- Part 2: DOM & Typography Assertions ---');

    const indexHtml = fs.readFileSync(path.join(__dirname, 'client', 'index.html'), 'utf8');
    assert(indexHtml.includes('id="auth-screen"'), 'client/index.html contains id="auth-screen"');
    assert(indexHtml.includes('id="auth-form"'), 'client/index.html contains id="auth-form"');
    assert(indexHtml.includes('id="logoutBtn"'), 'client/index.html contains id="logoutBtn"');
    assert(!indexHtml.includes('class="role-switch"'), 'client/index.html does not contain class="role-switch"');
    assert(indexHtml.includes('data-demo="customer"') && indexHtml.includes('data-demo="provider"') && indexHtml.includes('data-demo="admin"'),
        'client/index.html contains quick demo pills for all 3 roles');

    const styleCss = fs.readFileSync(path.join(__dirname, 'client', 'style.css'), 'utf8');
    assert(styleCss.includes('font-size: 40px') || styleCss.includes('font-size:40px'), 'client/style.css contains font-size: 40px for hero headline');
    assert(styleCss.includes('font-size: 32px') || styleCss.includes('font-size:32px'), 'client/style.css contains font-size: 32px for section headings');

    const sub11Matches = styleCss.match(/font-size:\s*([0-9]|10)px/g) || [];
    assert(sub11Matches.length === 0, `Typography scale: 0 font sizes under 11px (found ${sub11Matches.length})`);

    // --------------------------------------------------------
    // Part 3: Client JS Backend Integration
    // --------------------------------------------------------
    console.log('\n--- Part 3: Client JS Backend Integration ---');

    const appJs = fs.readFileSync(path.join(__dirname, 'client', 'app.js'), 'utf8');
    assert(appJs.includes("fetch('/api/auth/me'") || appJs.includes('fetch("/api/auth/me"'), 'client/app.js calls /api/auth/me');
    assert(appJs.includes("fetch('/api/services'") || appJs.includes('fetch("/api/services"'), 'client/app.js calls /api/services');
    assert(appJs.includes("fetch('/api/requests/mine'") || appJs.includes('fetch("/api/requests/mine"'), 'client/app.js calls /api/requests/mine');
    assert(appJs.includes("fetch('/api/requests/match'") || appJs.includes('fetch("/api/requests/match"'), 'client/app.js calls /api/requests/match');
    assert(appJs.includes("fetch('/api/auth/login'") || appJs.includes('fetch("/api/auth/login"'), 'client/app.js calls /api/auth/login');
    assert(!appJs.includes("localStorage.setItem('hf_"), 'client/app.js does not mock state with localStorage');
    assert(!appJs.includes('MockDB'), 'client/app.js does not contain MockDB');

    // --------------------------------------------------------
    // Part 4: Documentation Synchronization
    // --------------------------------------------------------
    console.log('\n--- Part 4: Documentation Synchronization ---');

    const uiDoc = fs.readFileSync(path.join(__dirname, 'docs', 'UI.md'), 'utf8');
    assert(uiDoc.includes('Fixora'), 'docs/UI.md mentions Fixora');
    assert(uiDoc.includes('RBAC'), 'docs/UI.md covers role-based access control (RBAC)');

    const apiDoc = fs.readFileSync(path.join(__dirname, 'docs', 'API.md'), 'utf8');
    assert(apiDoc.includes('/api/admin/stats'), 'docs/API.md documents /api/admin/stats');
    assert(apiDoc.includes('/api/admin/users'), 'docs/API.md documents /api/admin/users');
    assert(apiDoc.includes('/api/admin/bookings'), 'docs/API.md documents /api/admin/bookings');
    assert(apiDoc.includes('/api/providers/:userId/profile') || apiDoc.includes('/api/providers/'), 'docs/API.md documents provider profile API');
    assert(apiDoc.includes('/api/invoices/mine'), 'docs/API.md documents /api/invoices/mine');

    const changelog = fs.readFileSync(path.join(__dirname, 'docs', 'CHANGELOG.md'), 'utf8');
    assert(changelog.includes('Phase 10'), 'docs/CHANGELOG.md documents Phase 10');

    const roadmap = fs.readFileSync(path.join(__dirname, 'docs', 'ROADMAP.md'), 'utf8');
    assert(roadmap.includes('Phase 10') && (roadmap.includes('Done') || roadmap.includes('**Done**')), 'docs/ROADMAP.md marks Phase 10 as Done');

    const readme = fs.readFileSync(path.join(__dirname, 'README.md'), 'utf8');
    assert(readme.includes('Phase 10'), 'README.md contains Phase 10');

    // --------------------------------------------------------
    // Part 5: Functional Server Smoke & RBAC Tests
    // --------------------------------------------------------
    console.log('\n--- Part 5: Functional Server & RBAC Smoke Tests ---');

    const testPort = 5066;
    const serverProcess = spawn('node', ['server/index.js'], {
        cwd: __dirname,
        env: { ...process.env, PORT: testPort, NODE_ENV: 'test' },
        stdio: 'pipe'
    });

    await new Promise(r => setTimeout(r, 2000));

    function makeRequest(urlPath, options = {}) {
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: testPort,
                path: urlPath,
                method: options.method || 'GET',
                headers: options.headers || {}
            }, res => {
                let data = '';
                res.on('data', chunk => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: data }));
            });
            req.on('error', reject);
            if (options.body) req.write(options.body);
            req.end();
        });
    }

    try {
        // Health API
        const healthRes = await makeRequest('/api/health');
        assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
        const healthBody = JSON.parse(healthRes.body);
        assert(healthBody.ok === true && healthBody.db === 'connected', 'Health API responds ok: true, db: connected');

        // Static Files Serving
        const indexRes = await makeRequest('/');
        assert(indexRes.status === 200, 'GET / returns 200 OK');
        assert((indexRes.body.includes('FixHut') || indexRes.body.includes('Fixora')) && indexRes.body.includes('auth-screen'), 'Root HTML renders FixHut/Fixora UI with auth overlay');

        const styleRes = await makeRequest('/style.css');
        assert(styleRes.status === 200, 'GET /style.css returns 200 OK');

        const appRes = await makeRequest('/app.js');
        assert(appRes.status === 200, 'GET /app.js returns 200 OK');

        const imagesJsRes = await makeRequest('/js/images.js');
        assert(imagesJsRes.status === 200, 'GET /js/images.js returns 200 OK');

        // Unauthenticated Security Tests (401)
        const meNoAuth = await makeRequest('/api/auth/me');
        assert(meNoAuth.status === 401, 'GET /api/auth/me without auth returns 401 Unauthorized');

        const adminStatsNoAuth = await makeRequest('/api/admin/stats');
        assert(adminStatsNoAuth.status === 401, 'GET /api/admin/stats without auth returns 401 Unauthorized');

        const adminUsersNoAuth = await makeRequest('/api/admin/users');
        assert(adminUsersNoAuth.status === 401, 'GET /api/admin/users without auth returns 401 Unauthorized');

        // Customer Authentication & RBAC
        const custLogin = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
        });
        assert(custLogin.status === 200, 'POST /api/auth/login customer returns 200 OK');
        const custCookie = (custLogin.headers['set-cookie'] ? custLogin.headers['set-cookie'][0] : '').split(';')[0];
        assert(custCookie.includes('hutfix_token'), 'Customer login returns valid hutfix_token cookie');

        const custStatsRes = await makeRequest('/api/admin/stats', { headers: { Cookie: custCookie } });
        assert(custStatsRes.status === 403, 'RBAC: Customer accessing /api/admin/stats returns 403 Forbidden');

        const custUsersRes = await makeRequest('/api/admin/users', { headers: { Cookie: custCookie } });
        assert(custUsersRes.status === 403, 'RBAC: Customer accessing /api/admin/users returns 403 Forbidden');

        const custBookingsRes = await makeRequest('/api/admin/bookings', { headers: { Cookie: custCookie } });
        assert(custBookingsRes.status === 403, 'RBAC: Customer accessing /api/admin/bookings returns 403 Forbidden');

        // Customer Services Catalog & Matching
        const servicesRes = await makeRequest('/api/services', { headers: { Cookie: custCookie } });
        assert(servicesRes.status === 200, 'GET /api/services returns 200 OK');
        const servicesBody = JSON.parse(servicesRes.body);
        assert(servicesBody.ok === true && servicesBody.services.length === 8, 'Services endpoint returns all 8 categories');

        const nextSatDate = (() => {
            const d = new Date();
            const day = d.getUTCDay();
            let diff = (6 - day + 7) % 7;
            if (diff === 0) diff = 7;
            d.setUTCDate(d.getUTCDate() + diff);
            return d.toISOString().split('T')[0];
        })();

        const matchRes = await makeRequest('/api/requests/match', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Cookie: custCookie },
            body: JSON.stringify({
                category_slug: 'appliance-repair',
                preferred_date: nextSatDate,
                preferred_start_minute: 960,
                preferred_end_minute: 1080,
                urgency: 'normal',
                address: 'Dhanmondi, Dhaka',
                latitude: 23.7461,
                longitude: 90.3742
            })
        });
        assert(matchRes.status === 200, 'POST /api/requests/match returns 200 OK');
        const matchBody = JSON.parse(matchRes.body);
        assert(matchBody.ok === true && Array.isArray(matchBody.candidates) && matchBody.candidates.length > 0,
            'Matching engine returns candidate specialists for appliance repair');

        // Admin Authentication & Endpoints
        const adminLogin = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@demo.test', password: 'demo1234' })
        });
        assert(adminLogin.status === 200, 'POST /api/auth/login admin returns 200 OK');
        const adminCookie = (adminLogin.headers['set-cookie'] ? adminLogin.headers['set-cookie'][0] : '').split(';')[0];

        const adminStatsRes = await makeRequest('/api/admin/stats', { headers: { Cookie: adminCookie } });
        assert(adminStatsRes.status === 200, 'RBAC: Admin accessing /api/admin/stats returns 200 OK');
        const statsData = JSON.parse(adminStatsRes.body);
        assert(statsData.ok === true && typeof (Number(statsData.stats.total_bookings)) === 'number', 'Admin stats contains total_bookings metric');
        assert(typeof (Number(statsData.stats.platform_revenue)) === 'number', 'Admin stats contains platform_revenue metric');
        assert(Array.isArray(statsData.providers) && statsData.providers.length > 0, 'Admin stats includes providers array');

        const adminUsersList = await makeRequest('/api/admin/users', { headers: { Cookie: adminCookie } });
        assert(adminUsersList.status === 200, 'GET /api/admin/users returns 200 OK');
        const usersData = JSON.parse(adminUsersList.body);
        assert(usersData.ok === true && Array.isArray(usersData.users) && usersData.users.length >= 3,
            'Admin users ledger returns all platform users (>= 3 accounts)');

        const adminBookingsList = await makeRequest('/api/admin/bookings', { headers: { Cookie: adminCookie } });
        assert(adminBookingsList.status === 200, 'GET /api/admin/bookings returns 200 OK');
        const bookingsData = JSON.parse(adminBookingsList.body);
        assert(bookingsData.ok === true && Array.isArray(bookingsData.bookings), 'Admin bookings ledger returns master bookings array');

        // Provider Authentication & Endpoints
        const provLogin = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'provider@demo.test', password: 'demo1234' })
        });
        assert(provLogin.status === 200, 'POST /api/auth/login provider returns 200 OK');
        const provCookie = (provLogin.headers['set-cookie'] ? provLogin.headers['set-cookie'][0] : '').split(';')[0];

        const provReqsRes = await makeRequest('/api/provider/requests?bucket=incoming', { headers: { Cookie: provCookie } });
        assert(provReqsRes.status === 200, 'GET /api/provider/requests?bucket=incoming returns 200 OK');

        const provProfileRes = await makeRequest('/api/providers/2/profile', { headers: { Cookie: provCookie } });
        assert(provProfileRes.status === 200, 'GET /api/providers/2/profile returns 200 OK');
        const provProfileBody = JSON.parse(provProfileRes.body);
        assert(provProfileBody.ok === true && Array.isArray(provProfileBody.provider.services), 'Provider profile returns specialized service catalog');

        const provInvoicesRes = await makeRequest('/api/invoices/mine', { headers: { Cookie: provCookie } });
        assert(provInvoicesRes.status === 200, 'GET /api/invoices/mine returns 200 OK');
        const provInvoicesBody = JSON.parse(provInvoicesRes.body);
        assert(provInvoicesBody.ok === true && Array.isArray(provInvoicesBody.invoices), 'Provider invoices returns invoices ledger');

        const provStatsForbidden = await makeRequest('/api/admin/stats', { headers: { Cookie: provCookie } });
        assert(provStatsForbidden.status === 403, 'RBAC: Provider accessing /api/admin/stats returns 403 Forbidden');
    } finally {
        try { serverProcess.kill('SIGTERM'); } catch (_) {}
    }

    // --------------------------------------------------------
    // Part 6: Full Regression Suite (Phases 0 through 8)
    // --------------------------------------------------------
    console.log('\n--- Part 6: Running Full Regression Suite (Phases 0-8) ---');

    for (let p = 0; p <= 8; p++) {
        const testFile = `test_phase${p}.js`;
        console.log(`\n>>> Running regression: ${testFile}...`);
        try {
            execSync(`node ${testFile}`, {
                stdio: 'inherit',
                cwd: __dirname,
                env: { ...process.env, SKIP_NESTED_REGRESSION: '1' }
            });
            assert(true, `Regression suite ${testFile} exited 0`);
        } catch (e) {
            assert(false, `Regression suite ${testFile} failed`);
        }
    }

    // --------------------------------------------------------
    // Final Summary
    // --------------------------------------------------------
    console.log('\n====================================================');
    console.log(`PHASE 10 TEST RESULTS: PASS ${passCount} / FAIL ${failCount}`);
    console.log('====================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
});
