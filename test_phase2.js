/**
 * Phase 2 Verification Test Suite — JWT Auth, Role Guards, Login UI
 *
 * Verifies:
 * 1. Static file and code assertions (middleware, controller, routes, client UI, parity rules).
 * 2. Integration HTTP assertions (login customer/admin/provider, cookie management, register, me, logout).
 * 3. Database persistence check via pgcrypto.
 * 4. Regression checks (Phase 0 and Phase 1 test suites exit 0).
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn, execSync } = require('child_process');

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

console.log('====================================================');
console.log('   PHASE 2: JWT AUTH & ROLE GUARD TEST SUITE        ');
console.log('====================================================\n');

async function runTests() {
    // --------------------------------------------------------
    // 1. Static Assertions
    // --------------------------------------------------------
    console.log('--- 1. Static File & Code Structure Checks ---');

    const isLegacy = fs.existsSync(path.resolve(__dirname, 'client/customer.html'));
    const requiredFiles = [
        'server/middleware/auth.js',
        'server/controllers/auth.controller.js',
        'server/routes/auth.routes.js',
        isLegacy ? 'client/auth.js' : 'client/login.html',
        'client/js/api.js',
        isLegacy ? 'client/global.js' : 'client/js/auth.js',
        'test_phase2.js'
    ];

    requiredFiles.forEach(file => {
        const fullPath = path.resolve(__dirname, file);
        assert(fs.existsSync(fullPath), `Required file exists: ${file}`);
    });

    const middlewareContent = fs.readFileSync(path.resolve(__dirname, 'server/middleware/auth.js'), 'utf8');
    assert(middlewareContent.includes('requireAuth'), 'server/middleware/auth.js exports requireAuth');
    assert(middlewareContent.includes('requireRole'), 'server/middleware/auth.js exports requireRole');

    const controllerContent = fs.readFileSync(path.resolve(__dirname, 'server/controllers/auth.controller.js'), 'utf8');
    assert(controllerContent.includes('crypt('), 'server/controllers/auth.controller.js uses pgcrypto crypt(');
    assert(controllerContent.includes('gen_salt('), 'server/controllers/auth.controller.js uses pgcrypto gen_salt(');
    assert(controllerContent.includes('hutfix_token'), 'server/controllers/auth.controller.js uses hutfix_token cookie name');
    assert(controllerContent.includes('jsonwebtoken') || controllerContent.includes('jwt.sign'), 'server/controllers/auth.controller.js uses jsonwebtoken');
    assert(!/bcrypt/i.test(controllerContent), 'server/controllers/auth.controller.js does NOT contain bcrypt (parity rule)');

    const routesContent = fs.readFileSync(path.resolve(__dirname, 'server/routes/auth.routes.js'), 'utf8');
    assert(routesContent.includes('/register'), 'server/routes/auth.routes.js defines /register');
    assert(routesContent.includes('/login'), 'server/routes/auth.routes.js defines /login');
    assert(routesContent.includes('/logout'), 'server/routes/auth.routes.js defines /logout');
    assert(routesContent.includes('/me'), 'server/routes/auth.routes.js defines /me');

    const indexContent = fs.readFileSync(path.resolve(__dirname, 'server/index.js'), 'utf8');
    assert(indexContent.includes('/api/auth'), 'server/index.js mounts /api/auth');

    const loginHtmlPath = isLegacy ? path.resolve(__dirname, 'client/index.html') : path.resolve(__dirname, 'client/login.html');
    const loginHtmlContent = fs.readFileSync(loginHtmlPath, 'utf8');
    assert(loginHtmlContent.includes('id="login-form"'), 'login form present');
    assert(loginHtmlContent.includes('id="register-form"') || loginHtmlContent.includes('id="signup-form"'), 'register/signup form present');
    assert(isLegacy || loginHtmlContent.includes('id="auth-success"'), 'auth success present');
    assert(loginHtmlContent.includes('id="auth-error"') || loginHtmlContent.includes('id="login-error"'), 'auth error present');

    const apiJsContent = fs.readFileSync(path.resolve(__dirname, 'client/js/api.js'), 'utf8');
    assert(apiJsContent.includes("credentials: 'include'"), "client/js/api.js specifies credentials: 'include'");

    const gitignoreContent = fs.readFileSync(path.resolve(__dirname, '.gitignore'), 'utf8');
    assert(/^\.env$/m.test(gitignoreContent), '.gitignore explicitly ignores .env');

    // --------------------------------------------------------
    // 2. Integration Assertions (HTTP against running server)
    // --------------------------------------------------------
    console.log('\n--- 2. Integration HTTP Checks (Spawn Server) ---');
    await runIntegrationTests();

    // --------------------------------------------------------
    // 3. Database Persistence Assertion
    // --------------------------------------------------------
    console.log('\n--- 3. Database Persistence Assertion ---');
    let pool;
    try {
        const { Pool } = require('pg');
        const envConfig = require('./server/config/env');
        pool = new Pool({ connectionString: envConfig.DATABASE_URL });

        const countRes = await pool.query(
            "SELECT COUNT(*)::int AS count FROM users WHERE role='customer' AND email LIKE 'newuser_%@demo.test';"
        );
        const count = countRes.rows[0].count;
        assert(count >= 1, `DB assertion: registered test user persisted in database (found ${count})`);
    } catch (err) {
        assert(false, `DB assertion failed: ${err.message}`);
    } finally {
        if (pool) {
            await pool.end();
        }
    }

    // --------------------------------------------------------
    // 4. Regression Assertions
    // --------------------------------------------------------
    console.log('\n--- 4. Regression Suite Checks ---');
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

function runIntegrationTests() {
    return new Promise(resolve => {
        const envConfig = require('./server/config/env');
        const port = envConfig.PORT || 3000;

        // Clean any existing process holding the port
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

        let serverOutput = '';
        serverProc.stdout.on('data', data => { serverOutput += data.toString(); });
        serverProc.stderr.on('data', data => { serverOutput += data.toString(); });

        const startTime = Date.now();

        function httpRequest(options, postData = null) {
            return new Promise((resResolve, resReject) => {
                const req = http.request(options, res => {
                    let body = '';
                    res.on('data', chunk => { body += chunk; });
                    res.on('end', () => {
                        let json = null;
                        try { json = JSON.parse(body); } catch (_) {}
                        resResolve({
                            statusCode: res.statusCode,
                            headers: res.headers,
                            body,
                            json
                        });
                    });
                });
                req.on('error', err => resReject(err));
                if (postData) {
                    req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
                }
                req.end();
            });
        }

        async function executeSuite() {
            try {
                // Wait for /api/health
                let healthy = false;
                while (Date.now() - startTime < 8000) {
                    try {
                        const hRes = await httpRequest({
                            hostname: 'localhost',
                            port,
                            path: '/api/health',
                            method: 'GET'
                        });
                        if (hRes.statusCode === 200 && hRes.json && hRes.json.ok) {
                            healthy = true;
                            break;
                        }
                    } catch (_) {}
                    await new Promise(r => setTimeout(r, 200));
                }

                assert(healthy, 'Server spawned and responds 200 to /api/health');
                if (!healthy) {
                    try { serverProc.kill(); } catch (_) {}
                    return resolve();
                }

                let customerCookie = '';
                const uniqueEmail = `newuser_${Date.now()}@demo.test`;

                // Test A: Login demo customer
                const loginCustomerRes = await httpRequest({
                    hostname: 'localhost',
                    port,
                    path: '/api/auth/login',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }, { email: 'customer@demo.test', password: 'demo1234' });

                assert(loginCustomerRes.statusCode === 200, 'Test A: POST /api/auth/login returns 200');
                assert(loginCustomerRes.json && loginCustomerRes.json.ok === true, 'Test A: body.ok === true');
                assert(loginCustomerRes.json && loginCustomerRes.json.user && loginCustomerRes.json.user.role === 'customer', "Test A: body.user.role === 'customer'");

                const setCookieHeader = loginCustomerRes.headers['set-cookie'];
                const hasHutfixToken = setCookieHeader && setCookieHeader.some(c => c.includes('hutfix_token='));
                assert(hasHutfixToken, 'Test A: Set-Cookie contains hutfix_token=');

                if (hasHutfixToken) {
                    const match = setCookieHeader.find(c => c.includes('hutfix_token='));
                    customerCookie = match.split(';')[0];
                }

                // Test B: /api/auth/me with cookie
                const meWithCookieRes = await httpRequest({
                    hostname: 'localhost',
                    port,
                    path: '/api/auth/me',
                    method: 'GET',
                    headers: { 'Cookie': customerCookie }
                });
                assert(meWithCookieRes.statusCode === 200, 'Test B: GET /api/auth/me with cookie returns 200');
                assert(meWithCookieRes.json && meWithCookieRes.json.user && meWithCookieRes.json.user.email === 'customer@demo.test', "Test B: body.user.email === 'customer@demo.test'");

                // Test C: /api/auth/me without cookie
                const meNoCookieRes = await httpRequest({
                    hostname: 'localhost',
                    port,
                    path: '/api/auth/me',
                    method: 'GET'
                });
                assert(meNoCookieRes.statusCode === 401, 'Test C: GET /api/auth/me without cookie returns 401');

                // Test D: Wrong password
                const wrongPassRes = await httpRequest({
                    hostname: 'localhost',
                    port,
                    path: '/api/auth/login',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }, { email: 'customer@demo.test', password: 'wrong' });
                assert(wrongPassRes.statusCode === 401, 'Test D: POST login with wrong password returns 401');
                assert(wrongPassRes.json && wrongPassRes.json.ok === false, 'Test D: body.ok === false');

                // Test E: Register new user
                const regRes = await httpRequest({
                    hostname: 'localhost',
                    port,
                    path: '/api/auth/register',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }, {
                    email: uniqueEmail,
                    password: 'testpass123',
                    full_name: 'New Test User',
                    role: 'customer'
                });
                assert(regRes.statusCode === 200, 'Test E: POST /api/auth/register returns 200');
                assert(regRes.json && regRes.json.user && Boolean(regRes.json.user.id), 'Test E: body.user.id exists');
                const regCookie = regRes.headers['set-cookie'];
                assert(regCookie && regCookie.some(c => c.includes('hutfix_token=')), 'Test E: Response has Set-Cookie with hutfix_token');

                // Test F: Duplicate registration
                const dupRes = await httpRequest({
                    hostname: 'localhost',
                    port,
                    path: '/api/auth/register',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }, {
                    email: uniqueEmail,
                    password: 'testpass123',
                    full_name: 'New Test User Duplicate',
                    role: 'customer'
                });
                assert(dupRes.statusCode === 409, 'Test F: Duplicate registration returns 409');

                // Test G: Admin login
                const adminLoginRes = await httpRequest({
                    hostname: 'localhost',
                    port,
                    path: '/api/auth/login',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }, { email: 'admin@demo.test', password: 'demo1234' });
                assert(adminLoginRes.statusCode === 200, 'Test G: POST login admin returns 200');
                assert(adminLoginRes.json && adminLoginRes.json.user && adminLoginRes.json.user.role === 'admin', "Test G: body.user.role === 'admin'");

                // Test H: Provider login
                const providerLoginRes = await httpRequest({
                    hostname: 'localhost',
                    port,
                    path: '/api/auth/login',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                }, { email: 'provider@demo.test', password: 'demo1234' });
                assert(providerLoginRes.statusCode === 200, 'Test H: POST login provider returns 200');
                assert(providerLoginRes.json && providerLoginRes.json.user && providerLoginRes.json.user.role === 'provider', "Test H: body.user.role === 'provider'");

                // Test I: Logout
                const logoutRes = await httpRequest({
                    hostname: 'localhost',
                    port,
                    path: '/api/auth/logout',
                    method: 'POST',
                    headers: { 'Cookie': customerCookie }
                });
                assert(logoutRes.statusCode === 200, 'Test I: POST /api/auth/logout returns 200');
                assert(logoutRes.json && logoutRes.json.ok === true, 'Test I: body.ok === true');
                const logoutCookieHeader = logoutRes.headers['set-cookie'];
                const hasClearedToken = logoutCookieHeader && logoutCookieHeader.some(c => c.includes('hutfix_token=;'));
                assert(hasClearedToken, 'Test I: Set-Cookie clears hutfix_token=;');

            } catch (err) {
                assert(false, `Integration test error: ${err.message}`);
            } finally {
                try { serverProc.kill(); } catch (_) {}
                resolve();
            }
        }

        executeSuite();
    });
}

runTests();
