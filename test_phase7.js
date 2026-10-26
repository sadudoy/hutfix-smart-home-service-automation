/**
 * Phase 7 Verification Test Suite — Design System & Pages (Adapted for Phase 9 Legacy Restoration)
 */

const fs = require('fs');
const path = require('path');
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

console.log('====================================================');
console.log('   PHASE 7: DESIGN SYSTEM & PAGES VERIFICATION      ');
console.log('====================================================\n');

async function runTests() {
    console.log('--- Part A: Static File & Content Assertions ---');

    const isLegacy = fs.existsSync(path.join(__dirname, 'client', 'customer.html'));

    if (isLegacy) {
        // Phase 9 restored legacy files
        const legacyCssFiles = ['global.css', 'auth.css', 'customer.css', 'provider.css', 'admin.css'];
        for (const f of legacyCssFiles) {
            assert(fs.existsSync(path.join(__dirname, 'client', f)), `client/${f} exists`);
        }
        assert(fs.existsSync(path.join(__dirname, 'client', 'js', 'api.js')), 'client/js/api.js exists');

        const globalCss = fs.readFileSync(path.join(__dirname, 'client', 'global.css'), 'utf8');
        assert(globalCss.includes('--royal-blue') && globalCss.includes('--sky-blue'), 'global.css contains blue branding tokens');
        assert(globalCss.includes('[data-theme="dark"]'), 'global.css contains dark theme overrides');

        const indexContent = fs.readFileSync(path.join(__dirname, 'client', 'index.html'), 'utf8');
        assert(indexContent.includes('services-grid'), 'index.html contains services-grid');
        assert(indexContent.includes('auth-modal'), 'index.html contains auth-modal');
        assert(indexContent.includes('login-form'), 'index.html contains login-form');
        assert(indexContent.includes('signup-form'), 'index.html contains signup-form');
        assert(indexContent.includes('booking-modal'), 'index.html contains booking-modal');

        const customerContent = fs.readFileSync(path.join(__dirname, 'client', 'customer.html'), 'utf8');
        assert(customerContent.includes('booking-form'), 'customer.html contains booking-form');
        assert(customerContent.includes('match-result-container'), 'customer.html contains match-result-container');
        assert(customerContent.includes('bookings-list'), 'customer.html contains bookings-list');

        const providerContent = fs.readFileSync(path.join(__dirname, 'client', 'provider.html'), 'utf8');
        assert(providerContent.includes('requests-list'), 'provider.html contains requests-list');
        assert(providerContent.includes('active-jobs-list'), 'provider.html contains active-jobs-list');
        assert(providerContent.includes('service-settings-form'), 'provider.html contains service-settings-form');

        const adminContent = fs.readFileSync(path.join(__dirname, 'client', 'admin.html'), 'utf8');
        assert(adminContent.includes('stat-total-bookings'), 'admin.html contains stat-total-bookings');
        assert(adminContent.includes('stat-total-revenue'), 'admin.html contains stat-total-revenue');
        assert(adminContent.includes('admin-bookings-table'), 'admin.html contains admin-bookings-table');

        const invoiceContent = fs.readFileSync(path.join(__dirname, 'client', 'invoice.html'), 'utf8');
        assert(invoiceContent.includes('invoice-card') || invoiceContent.includes('invoice-num'), 'invoice.html contains invoice markup');
    }

    // Accessibility: aria-label on every .theme-toggle in all html files
    const allHtmlFiles = isLegacy 
        ? ['index.html', 'customer.html', 'provider.html', 'admin.html', 'invoice.html']
        : ['index.html', 'login.html', 'request.html', 'tracking.html', 'provider.html', 'invoice.html'];

    let allTogglesHaveAria = true;
    for (const file of allHtmlFiles) {
        const fileText = fs.readFileSync(path.join(__dirname, 'client', file), 'utf8');
        const tagRegex = /<([a-z0-9]+)\b[^>]*class=["'][^"']*\btheme-toggle\b[^"']*["'][^>]*>/gi;
        let match;
        while ((match = tagRegex.exec(fileText)) !== null) {
            const tagStr = match[0];
            if (!tagStr.includes('aria-label=')) {
                allTogglesHaveAria = false;
                console.error(`Missing aria-label on theme-toggle in client/${file}: ${tagStr}`);
            }
        }
    }
    assert(allTogglesHaveAria, 'Every .theme-toggle across all HTML files has aria-label');

    const indexContent = fs.readFileSync(path.join(__dirname, 'client', 'index.html'), 'utf8');
    const imgMatches = indexContent.match(/<img\b[^>]*>/gi) || [];
    let allImgsHaveAlt = true;
    for (const imgTag of imgMatches) {
        if (!imgTag.includes('alt=')) {
            allImgsHaveAlt = false;
        }
    }
    assert(allImgsHaveAlt, 'All <img> tags in index.html have alt attribute');

    // --------------------------------------------------------
    // Part B: Functional Smoke Tests
    // --------------------------------------------------------
    console.log('\n--- Part B: Functional Smoke Tests ---');

    const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const portMatch = envFile.match(/^PORT=(\d+)/m);
    const port = portMatch ? portMatch[1] : 3000;
    const baseUrl = `http://127.0.0.1:${port}`;

    let serverProc = null;

    try {
        if (process.platform === 'win32') {
            try {
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
            } catch (_) {}
        }

        serverProc = spawn('node', ['server/index.js'], {
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        process.on('exit', () => {
            try { if (serverProc) serverProc.kill(); } catch (_) {}
        });

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
        assert(serverReady, 'Server spawned and healthy on /api/health');

        const landingRes = await fetch(`${baseUrl}/`);
        const landingText = await landingRes.text();
        assert(landingRes.status === 200 && landingText.includes('HutFix'), 'GET / returns 200 and contains HutFix');

        const custRes = await fetch(`${baseUrl}/customer.html`);
        assert(custRes.status === 200, 'GET /customer.html returns 200');

        const provRes = await fetch(`${baseUrl}/provider.html`);
        assert(provRes.status === 200, 'GET /provider.html returns 200');

        const cssRes = await fetch(`${baseUrl}/global.css`);
        const cssType = cssRes.headers.get('content-type') || '';
        assert(cssRes.status === 200 && cssType.includes('text/css'), 'GET /global.css returns 200 with text/css');

        const servicesRes = await fetch(`${baseUrl}/api/services`);
        const servicesData = await servicesRes.json();
        const serviceList = servicesData.services || servicesData.categories || [];
        assert(
            servicesRes.status === 200 &&
            servicesData.ok &&
            Array.isArray(serviceList) &&
            serviceList.length === 8,
            'GET /api/services returns 200 with 8 services'
        );

        const healthRes = await fetch(`${baseUrl}/api/health`);
        const healthData = await healthRes.json();
        assert(
            healthRes.status === 200 &&
            healthData.ok &&
            healthData.db === 'connected',
            'GET /api/health returns { ok: true, db: "connected" }'
        );

        if (serverProc) {
            serverProc.kill();
            serverProc = null;
        }
    } catch (err) {
        console.error('Smoke test exception:', err);
        assert(false, 'Smoke tests ran without exceptions', err.message);
        if (serverProc) {
            try { serverProc.kill(); } catch (_) {}
            serverProc = null;
        }
    }

    // --------------------------------------------------------
    // Part C: Regression Suites (Phases 0 through 6)
    // --------------------------------------------------------
    console.log('\n--- Part C: Running Regression Suites (Phases 0-6) ---');
    const regressions = [
        'test_phase0.js',
        'test_phase1.js',
        'test_phase2.js',
        'test_phase3.js',
        'test_phase4.js',
        'test_phase5.js',
        'test_phase6.js'
    ];

    if (!process.env.SKIP_NESTED_REGRESSION) {
        for (const reg of regressions) {
            try {
                console.log(`\n>>> Running regression: ${reg}...`);
                execSync(`node ${reg}`, { stdio: 'inherit', cwd: __dirname });
                assert(true, `Regression suite ${reg} exited 0`);
            } catch (err) {
                assert(false, `Regression suite ${reg} failed`, err.message);
            }
        }
    } else {
        console.log('[INFO] Nested regression skipped via SKIP_NESTED_REGRESSION');
    }

    console.log('\n====================================================');
    console.log(`PHASE 7 TEST RESULTS: PASS ${passCount} / FAIL ${failCount} / SKIP ${skipCount}`);
    console.log('====================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTests();
