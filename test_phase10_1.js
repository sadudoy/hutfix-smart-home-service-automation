/**
 * Phase 10.1 Verification Test Suite — Sticky Sidebar, Guest Browsing, Profile Editing, Icons, Branding
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
console.log('   PHASE 10.1: UI HOTFIX & PROFILE UPDATE SUITE     ');
console.log('====================================================\n');

async function runTests() {
    // --------------------------------------------------------
    // Part 1: Static Code & File Assertions
    // --------------------------------------------------------
    console.log('--- Part 1: Static Code & File Assertions ---');

    const indexHtml = fs.readFileSync(path.join(__dirname, 'client', 'index.html'), 'utf8');
    assert(indexHtml.includes('assets/images/logo.jpg'), 'client/index.html contains assets/images/logo.jpg');
    assert(indexHtml.includes('FixHut'), 'client/index.html contains FixHut branding');
    assert(indexHtml.includes('id="login-btn"'), 'client/index.html contains id="login-btn" in topbar');
    assert(indexHtml.includes('bootstrap-icons'), 'client/index.html includes Bootstrap Icons stylesheet');

    const styleCss = fs.readFileSync(path.join(__dirname, 'client', 'style.css'), 'utf8');
    assert(styleCss.includes('position:sticky') || styleCss.includes('position: sticky'), 'client/style.css contains position: sticky for .sidebar');

    const appJs = fs.readFileSync(path.join(__dirname, 'client', 'app.js'), 'utf8');
    assert(appJs.includes("state.role === 'guest'") || appJs.includes('state.role === "guest"'), "client/app.js handles state.role === 'guest'");
    assert(appJs.includes('bi-tools'), 'client/app.js contains bi-tools Bootstrap Icon');
    assert(appJs.includes('bi-droplet'), 'client/app.js contains bi-droplet Bootstrap Icon');
    assert(appJs.includes('bi-search'), 'client/app.js contains bi-search Bootstrap Icon');
    assert(appJs.includes('/api/auth/profile'), 'client/app.js calls /api/auth/profile');

    const authCtrl = fs.readFileSync(path.join(__dirname, 'server', 'controllers', 'auth.controller.js'), 'utf8');
    assert(authCtrl.includes('updateProfile'), 'server/controllers/auth.controller.js contains updateProfile');

    const authRoutes = fs.readFileSync(path.join(__dirname, 'server', 'routes', 'auth.routes.js'), 'utf8');
    assert(authRoutes.includes('/profile'), 'server/routes/auth.routes.js defines /profile');

    // --------------------------------------------------------
    // Part 2: Functional Server Smoke & Profile Update Tests
    // --------------------------------------------------------
    console.log('\n--- Part 2: Functional Server & Profile Update Tests ---');

    const testPort = '5077';
    const serverProcess = spawn('node', ['server/index.js'], {
        cwd: __dirname,
        env: { ...process.env, PORT: String(testPort), NODE_ENV: 'test' },
        stdio: 'pipe'
    });

    await new Promise((resolve) => {
        let started = false;
        serverProcess.stdout.on('data', data => {
            if (data.toString().includes('Server ready')) {
                started = true;
                resolve();
            }
        });
        setTimeout(() => {
            if (!started) resolve();
        }, 3000);
    });

    function makeRequest(urlPath, options = {}) {
        return new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: Number(testPort),
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
        // 2.1 GET /api/auth/me (no cookie) -> 401
        const meNoAuth = await makeRequest('/api/auth/me');
        assert(meNoAuth.status === 401, 'GET /api/auth/me (no cookie) returns 401');

        // 2.2 GET / (as guest) -> 200
        const rootRes = await makeRequest('/');
        assert(rootRes.status === 200, 'GET / (as guest) returns 200');
        assert(rootRes.body.includes('FixHut'), 'Root HTML renders FixHut brand for guests');

        // 2.3 Customer login & profile update
        const custLogin = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
        });
        assert(custLogin.status === 200, 'Customer login returns 200');
        const custCookie = (custLogin.headers['set-cookie'] ? custLogin.headers['set-cookie'][0] : '').split(';')[0];

        // PATCH /api/auth/profile with updated name and email
        const patchCust = await makeRequest('/api/auth/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: custCookie },
            body: JSON.stringify({ full_name: 'Updated Name', email: 'updated@demo.test' })
        });
        assert(patchCust.status === 200, 'PATCH /api/auth/profile (customer) returns 200');
        const patchCustBody = JSON.parse(patchCust.body);
        assert(patchCustBody.ok === true && patchCustBody.user.full_name === 'Updated Name', 'Response user has updated full_name');
        assert(patchCustBody.user.email === 'updated@demo.test', 'Response user has updated email');

        // Check in PostgreSQL database
        const dbCheck = await pool.query("SELECT full_name, email FROM users WHERE email = 'updated@demo.test';");
        assert(dbCheck.rows.length === 1 && dbCheck.rows[0].full_name === 'Updated Name', 'Database row confirmed with Updated Name');

        // Revert customer back to demo defaults for regression idempotency
        await pool.query("UPDATE users SET full_name = 'Demo Customer', email = 'customer@demo.test' WHERE email = 'updated@demo.test';");
        console.log('[INFO] Customer record restored to demo defaults');

        // 2.4 Admin login & profile update with password
        const adminLogin = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@demo.test', password: 'demo1234' })
        });
        assert(adminLogin.status === 200, 'Admin login returns 200');
        const adminCookie = (adminLogin.headers['set-cookie'] ? adminLogin.headers['set-cookie'][0] : '').split(';')[0];

        const patchAdmin = await makeRequest('/api/auth/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
            body: JSON.stringify({ password: 'newadminpass1234' })
        });
        assert(patchAdmin.status === 200, 'PATCH /api/auth/profile (admin password change) returns 200');

        // Verify login works with new password
        const verifyAdminNewPass = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@demo.test', password: 'newadminpass1234' })
        });
        assert(verifyAdminNewPass.status === 200, 'Admin login succeeds with new password');

        // Revert admin password back to demo1234
        const newAdminCookie = (verifyAdminNewPass.headers['set-cookie'] ? verifyAdminNewPass.headers['set-cookie'][0] : '').split(';')[0];
        await makeRequest('/api/auth/profile', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Cookie: newAdminCookie },
            body: JSON.stringify({ password: 'demo1234' })
        });
        console.log('[INFO] Admin password restored to demo1234');
    } finally {
        try { serverProcess.kill('SIGTERM'); } catch (_) {}
    }

    // --------------------------------------------------------
    // Part 3: Regression Suite (Phase 10)
    // --------------------------------------------------------
    console.log('\n--- Part 3: Running Phase 10 Regression Suite ---');

    try {
        execSync('node test_phase10.js', {
            stdio: 'inherit',
            cwd: __dirname,
            env: { ...process.env, SKIP_NESTED_REGRESSION: '1' }
        });
        assert(true, 'Regression test_phase10.js exited 0');
    } catch (e) {
        assert(false, 'Regression test_phase10.js failed');
    }

    // --------------------------------------------------------
    // Final Summary
    // --------------------------------------------------------
    console.log('\n====================================================');
    console.log(`PHASE 10.1 TEST RESULTS: PASS ${passCount} / FAIL ${failCount}`);
    console.log('====================================================');

    await pool.end();

    if (failCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runTests().catch(err => {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
});
