/**
 * Phase 9 Verification Test Suite — Legacy UI Restoration & Backend Rewiring
 *
 * Verifies:
 * 1. Static file structure (legacy files restored, Phase 7/8 artificial files purged, bug fixes applied).
 * 2. Client JS backend integration assertions.
 * 3. Functional server smoke tests (HTML serving, API endpoints, auth, admin stats, provider settings).
 * 4. Full regression suite (Phases 0 through 8 exit 0).
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
console.log('   PHASE 9: LEGACY UI RESTORATION & REWIRING SUITE  ');
console.log('====================================================\n');

async function runTests() {
    // --------------------------------------------------------
    // Part 1: Static File & Legacy Preservation Assertions
    // --------------------------------------------------------
    console.log('--- Part 1: Static Files & Legacy Preservation ---');

    // 1.1 Legacy directory intact
    assert(fs.existsSync(path.join(__dirname, 'client', '_legacy')), 'client/_legacy/ directory exists');
    const legacyKeyFiles = ['index.html', 'customer.html', 'provider.html', 'admin.html', 'global.css', 'auth.css', 'db.js', 'auth.js'];
    for (const f of legacyKeyFiles) {
        assert(fs.existsSync(path.join(__dirname, 'client', '_legacy', f)), `client/_legacy/${f} is preserved intact`);
    }

    // 1.2 Restored files in client/
    const restoredHtml = ['index.html', 'customer.html', 'provider.html', 'admin.html', 'invoice.html'];
    for (const f of restoredHtml) {
        assert(fs.existsSync(path.join(__dirname, 'client', f)), `client/${f} exists`);
    }
    const restoredCss = ['global.css', 'auth.css', 'customer.css', 'provider.css', 'admin.css'];
    for (const f of restoredCss) {
        assert(fs.existsSync(path.join(__dirname, 'client', f)), `client/${f} exists`);
    }
    assert(fs.existsSync(path.join(__dirname, 'client', 'js', 'api.js')), 'client/js/api.js exists');
    assert(fs.existsSync(path.join(__dirname, 'client', 'images', 'logo.jpg')), 'client/images/logo.jpg exists');

    // 1.3 Clean removal of Phase 7/8 artificial design system
    const purgedFiles = [
        'client/css/tokens.css',
        'client/css/components.css',
        'client/css/pages.css',
        'client/js/theme.js',
        'client/tracking.html',
        'client/request.html',
        'client/login.html'
    ];
    for (const f of purgedFiles) {
        assert(!fs.existsSync(path.join(__dirname, f)), `Artificial Phase 7/8 file purged: ${f}`);
    }

    // 1.4 Defect fixes verified
    const indexContent = fs.readFileSync(path.join(__dirname, 'client', 'index.html'), 'utf8');
    assert(!/<\/html>\s*k\s*$/i.test(indexContent), 'client/index.html trailing "k" defect resolved');
    assert(indexContent.includes('services-grid'), 'client/index.html contains #services-grid');
    assert(indexContent.includes('auth-modal'), 'client/index.html contains #auth-modal');
    assert(indexContent.includes('booking-modal'), 'client/index.html contains #booking-modal');

    const customerCss = fs.readFileSync(path.join(__dirname, 'client', 'customer.css'), 'utf8');
    assert(customerCss.includes('.timeline') && (customerCss.includes('flex-direction: column') || customerCss.includes('max-width: 600px')), 'customer.css has mobile timeline responsive layout');

    const adminHtml = fs.readFileSync(path.join(__dirname, 'client', 'admin.html'), 'utf8');
    assert(adminHtml.includes('overflow-x') && adminHtml.includes('table-responsive'), 'admin.html contains horizontal scroll wrapper for data tables');

    const globalCss = fs.readFileSync(path.join(__dirname, 'client', 'global.css'), 'utf8');
    assert(globalCss.includes('--royal-blue') && globalCss.includes('--sky-blue'), 'global.css contains original Royal Blue & Sky Blue brand palette');

    const providerJs = fs.readFileSync(path.join(__dirname, 'client', 'provider.js'), 'utf8');
    assert(providerJs.includes('ui-avatars.com'), 'provider.js uses dynamic avatar generation');

    // --------------------------------------------------------
    // Part 2: Client JS Backend Integration Checks
    // --------------------------------------------------------
    console.log('\n--- Part 2: Client JS Backend Integration Checks ---');

    const authJs = fs.readFileSync(path.join(__dirname, 'client', 'auth.js'), 'utf8');
    assert(authJs.includes('/api/auth/login') && authJs.includes('/api/auth/register'), 'auth.js calls real Express auth endpoints');

    const globalJs = fs.readFileSync(path.join(__dirname, 'client', 'global.js'), 'utf8');
    assert(globalJs.includes('/api/services'), 'global.js fetches live category catalog from /api/services');
    assert(globalJs.includes('/api/auth/me') || globalJs.includes('hutfix_user'), 'global.js checks active user authentication');

    const customerJs = fs.readFileSync(path.join(__dirname, 'client', 'customer.js'), 'utf8');
    assert(customerJs.includes('/api/requests/match'), 'customer.js calls /api/requests/match for provider scoring');
    assert(customerJs.includes('/api/requests/mine'), 'customer.js fetches user bookings from /api/requests/mine');
    assert(customerJs.includes('/api/ratings'), 'customer.js wires ratings to /api/ratings');

    const adminJs = fs.readFileSync(path.join(__dirname, 'client', 'admin.js'), 'utf8');
    assert(adminJs.includes('/api/admin/stats'), 'admin.js calls /api/admin/stats');

    // --------------------------------------------------------
    // Part 3: Functional Server Smoke Tests
    // --------------------------------------------------------
    console.log('\n--- Part 3: Functional Server Smoke Tests ---');

    const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const portMatch = envFile.match(/^PORT=(\d+)/m);
    const testPort = portMatch ? parseInt(portMatch[1], 10) : 3000;

    // Clean up port if occupied
    if (process.platform === 'win32') {
        try {
            const findCmd = `netstat -ano | findstr :${testPort}`;
            const output = execSync(findCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
            const lines = output.trim().split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const pid = parts[parts.length - 1];
                if (pid && pid !== '0' && parts[1] && parts[1].endsWith(`:${testPort}`)) {
                    try { process.kill(parseInt(pid, 10), 'SIGKILL'); } catch (_) {}
                }
            }
        } catch (_) {}
    }

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
        // Smoke HTML pages
        for (const hf of restoredHtml) {
            const res = await makeRequest(`/${hf === 'index.html' ? '' : hf}`);
            assert(res.status === 200, `GET /${hf} returns 200 OK`);
        }

        // Smoke CSS
        const cssRes = await makeRequest('/global.css');
        assert(cssRes.status === 200, 'GET /global.css returns 200 OK');

        // Health API
        const healthRes = await makeRequest('/api/health');
        assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
        const healthBody = JSON.parse(healthRes.body);
        assert(healthBody.ok === true && healthBody.db === 'connected', 'Health returns ok: true, db: connected');

        // Services API
        const servicesRes = await makeRequest('/api/services');
        assert(servicesRes.status === 200, 'GET /api/services returns 200 OK');
        const servicesBody = JSON.parse(servicesRes.body);
        assert(servicesBody.ok === true && servicesBody.services.length === 8, 'Services returns 8 categories');

        // Customer Login
        const custLoginRes = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
        });
        assert(custLoginRes.status === 200, 'POST /api/auth/login (customer) returns 200 OK');
        const custCookie = (custLoginRes.headers['set-cookie'] ? custLoginRes.headers['set-cookie'][0] : '').split(';')[0];
        assert(custCookie.includes('hutfix_token'), 'Customer login sets hutfix_token cookie');

        // Provider Login
        const provLoginRes = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'provider@demo.test', password: 'demo1234' })
        });
        assert(provLoginRes.status === 200, 'POST /api/auth/login (provider) returns 200 OK');
        const provCookie = (provLoginRes.headers['set-cookie'] ? provLoginRes.headers['set-cookie'][0] : '').split(';')[0];

        // Admin Login
        const adminLoginRes = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@demo.test', password: 'demo1234' })
        });
        assert(adminLoginRes.status === 200, 'POST /api/auth/login (admin) returns 200 OK');
        const adminCookie = (adminLoginRes.headers['set-cookie'] ? adminLoginRes.headers['set-cookie'][0] : '').split(';')[0];

        // Customer mine requests
        const custMineRes = await makeRequest('/api/requests/mine', {
            headers: { Cookie: custCookie }
        });
        assert(custMineRes.status === 200, 'GET /api/requests/mine (customer) returns 200 OK');

        // Provider mine requests
        const provMineRes = await makeRequest('/api/requests/mine', {
            headers: { Cookie: provCookie }
        });
        assert(provMineRes.status === 200, 'GET /api/requests/mine (provider) returns 200 OK');

        // Provider Settings GET & PATCH
        const provSettingsGet = await makeRequest('/api/provider/settings', {
            headers: { Cookie: provCookie }
        });
        assert(provSettingsGet.status === 200, 'GET /api/provider/settings returns 200 OK');
        const provSettingsBody = JSON.parse(provSettingsGet.body);
        assert(provSettingsBody.ok === true && provSettingsBody.provider, 'Provider settings returns provider object');

        const provSettingsPatch = await makeRequest('/api/provider/settings', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: provCookie },
            body: JSON.stringify({ bio: ' Rahim Electronics & AC Care - Certified Master Technician', hourly_rate: 1050 })
        });
        assert(provSettingsPatch.status === 200, 'PATCH /api/provider/settings returns 200 OK');

        // Admin Stats GET
        const adminStatsRes = await makeRequest('/api/admin/stats', {
            headers: { Cookie: adminCookie }
        });
        assert(adminStatsRes.status === 200, 'GET /api/admin/stats returns 200 OK');
        const adminStatsBody = JSON.parse(adminStatsRes.body);
        assert(adminStatsBody.ok === true && adminStatsBody.stats, 'Admin stats returns KPI object');
        assert('totalBookings' in adminStatsBody.stats && 'totalRevenue' in adminStatsBody.stats, 'Admin KPI includes totalBookings and totalRevenue');

        // Providers List GET
        const providersListRes = await makeRequest('/api/providers');
        assert(providersListRes.status === 200, 'GET /api/providers returns 200 OK');

    } finally {
        try { serverProcess.kill('SIGTERM'); } catch (_) {}
    }

    // --------------------------------------------------------
    // Part 4: Full Regression Suite (Phases 0 through 8)
    // --------------------------------------------------------
    console.log('\n--- Part 4: Running Full Regression Suite (Phases 0-8) ---');

    for (let p = 0; p <= 8; p++) {
        const testFile = `test_phase${p}.js`;
        console.log(`\n>>> Running regression: ${testFile}...`);
        try {
            execSync(`node ${testFile}`, { stdio: 'inherit', cwd: __dirname, env: { ...process.env, SKIP_NESTED_REGRESSION: '1' } });
            assert(true, `Regression suite ${testFile} exited 0`);
        } catch (e) {
            assert(false, `Regression suite ${testFile} failed`);
        }
    }

    // --------------------------------------------------------
    // Final Summary
    // --------------------------------------------------------
    console.log('\n====================================================');
    console.log(`PHASE 9 TEST RESULTS: PASS ${passCount} / FAIL ${failCount}`);
    console.log('====================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
});
