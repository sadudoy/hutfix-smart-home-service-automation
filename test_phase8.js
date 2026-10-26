/**
 * Phase 8 Verification Test Suite — Impeccable-Driven Redesign + Dark-Mode Hardening
 * (Updated with Phase 9 Legacy UI Restoration compatibility)
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
console.log('   PHASE 8: IMPECCABLE REDESIGN & DARK-MODE SUITE   ');
console.log('====================================================\n');

async function runTests() {
    const isLegacy = fs.existsSync(path.join(__dirname, 'client', 'customer.html'));

    // --------------------------------------------------------
    // Part 1: Product Truth & Detector Baseline Assertions
    // --------------------------------------------------------
    console.log('--- Part 1: Product Truth & Detector Assertions ---');

    const productMdPath = path.join(__dirname, 'PRODUCT.md');
    assert(fs.existsSync(productMdPath), 'PRODUCT.md exists');
    const productMd = fs.readFileSync(productMdPath, 'utf8');
    assert(productMd.includes('HutFix') && productMd.includes('Product Purpose'), 'PRODUCT.md contains durable product purpose');

    const detectBeforePath = path.join(__dirname, '.impeccable', 'detect-before.json');
    const detectAfterPath = path.join(__dirname, '.impeccable', 'detect-after.json');
    assert(fs.existsSync(detectBeforePath), '.impeccable/detect-before.json exists');
    assert(fs.existsSync(detectAfterPath), '.impeccable/detect-after.json exists');

    const beforeFindings = JSON.parse(fs.readFileSync(detectBeforePath, 'utf8').replace(/^\uFEFF/, ''));
    const afterFindings = JSON.parse(fs.readFileSync(detectAfterPath, 'utf8').replace(/^\uFEFF/, ''));

    assert(Array.isArray(beforeFindings) && beforeFindings.length > 0, `Baseline detect findings recorded (${beforeFindings.length} findings)`);
    assert(Array.isArray(afterFindings), 'Post-redesign detect findings loaded');
    assert(afterFindings.length < beforeFindings.length, `Detector findings reduced: ${afterFindings.length} < ${beforeFindings.length}`);

    const bannedRules = ['gradient-text', 'ai-color-palette', 'dark-glow', 'overused-font', 'nested-cards', 'side-tab'];
    for (const rule of bannedRules) {
        const hits = afterFindings.filter(f => f.antipattern === rule);
        assert(hits.length === 0, `Zero findings for banned rule: "${rule}" (found ${hits.length})`);
    }

    // --------------------------------------------------------
    // Part 2: Theme, Tokens & Dark Mode Parity
    // --------------------------------------------------------
    console.log('\n--- Part 2: Theme, Tokens & Dark Mode Parity ---');

    if (isLegacy) {
        // In Phase 9, tokens.css was replaced with restored global.css
        const globalCssPath = path.join(__dirname, 'client', 'global.css');
        assert(fs.existsSync(globalCssPath), 'client/global.css exists');
        const globalCss = fs.readFileSync(globalCssPath, 'utf8');

        assert(globalCss.includes('--royal-blue') && globalCss.includes('--sky-blue'), 'global.css has brand color tokens');
        assert(globalCss.includes('[data-theme="dark"]') || globalCss.includes('data-theme'), 'global.css supports dark theme');
        assert(!fs.existsSync(path.join(__dirname, 'client', 'css', 'tokens.css')), 'Phase 7/8 tokens.css cleanly removed');
        assert(!fs.existsSync(path.join(__dirname, 'client', 'css', 'components.css')), 'Phase 7/8 components.css cleanly removed');
        assert(!fs.existsSync(path.join(__dirname, 'client', 'css', 'pages.css')), 'Phase 7/8 pages.css cleanly removed');
        assert(!fs.existsSync(path.join(__dirname, 'client', 'js', 'theme.js')), 'Phase 7/8 theme.js cleanly removed');
    } else {
        const tokensPath = path.join(__dirname, 'client', 'css', 'tokens.css');
        assert(fs.existsSync(tokensPath), 'client/css/tokens.css exists');
        const tokensContent = fs.readFileSync(tokensPath, 'utf8');

        assert(tokensContent.includes('color-scheme: light'), 'tokens.css :root has color-scheme: light');
        assert(tokensContent.includes('color-scheme: dark'), 'tokens.css [data-theme="dark"] has color-scheme: dark');

        // Parse tokens to test symmetry
        const rootBlockMatch = tokensContent.match(/:root\s*\{([^}]+)\}/);
        const darkBlockMatch = tokensContent.match(/\[data-theme=["']dark["']\]\s*\{([^}]+)\}/);
        assert(rootBlockMatch && darkBlockMatch, 'tokens.css has :root and [data-theme="dark"] blocks');

        const rootTokens = {};
        if (rootBlockMatch) {
            for (const line of rootBlockMatch[1].split('\n')) {
                const m = line.trim().match(/^(--[\w-]+)\s*:\s*([^;]+);/);
                if (m) rootTokens[m[1]] = m[2].trim();
            }
        }

        const darkTokens = {};
        if (darkBlockMatch) {
            for (const line of darkBlockMatch[1].split('\n')) {
                const m = line.trim().match(/^(--[\w-]+)\s*:\s*([^;]+);/);
                if (m) darkTokens[m[1]] = m[2].trim();
            }
        }

        const colorPrefixes = ['--color-', '--bg', '--surface', '--text', '--muted', '--border', '--accent', '--success', '--warning', '--danger', '--info'];
        let symmetryMissing = [];
        for (const tokenName of Object.keys(rootTokens)) {
            if (colorPrefixes.some(p => tokenName.startsWith(p))) {
                if (!darkTokens[tokenName]) {
                    symmetryMissing.push(tokenName);
                }
            }
        }
        assert(symmetryMissing.length === 0, `Token symmetry: all color tokens in :root overridden in [data-theme="dark"] (missing: ${symmetryMissing.join(', ') || 'none'})`);
    }

    // --------------------------------------------------------
    // Part 3: Detector-Clean CSS & Clean Markup
    // --------------------------------------------------------
    console.log('\n--- Part 3: CSS Cleanliness & Zero AI Artifacts ---');

    const bannedPatterns = [
        'accent-gradient',
        '#6366f1',
        '#8b5cf6',
        '#7c3aed'
    ];

    if (isLegacy) {
        const legacyCss = fs.readFileSync(path.join(__dirname, 'client', 'global.css'), 'utf8');
        for (const bp of bannedPatterns) {
            assert(!legacyCss.includes(bp), `client/global.css does not contain AI pattern "${bp}"`);
        }
    } else {
        const cssFiles = ['client/css/components.css', 'client/css/pages.css'];
        for (const f of cssFiles) {
            const content = fs.readFileSync(path.join(__dirname, f), 'utf8');
            for (const bp of bannedPatterns) {
                assert(!content.includes(bp), `${f} does not contain banned pattern "${bp}"`);
            }
        }
    }

    // --------------------------------------------------------
    // Part 4: DOM Hook Integrity Checks
    // --------------------------------------------------------
    console.log('\n--- Part 4: DOM Hook Integrity Checks ---');

    const htmlFiles = isLegacy 
        ? ['index.html', 'customer.html', 'provider.html', 'admin.html', 'invoice.html']
        : ['index.html', 'login.html', 'request.html', 'tracking.html', 'provider.html', 'invoice.html'];

    const requiredHooks = isLegacy ? {
        'index.html': ['services-grid', 'booking-modal', 'auth-modal', 'login-form', 'signup-form'],
        'customer.html': ['booking-form', 'match-result-container', 'bookings-list'],
        'provider.html': ['requests-list', 'active-jobs-list', 'service-settings-form'],
        'admin.html': ['stat-total-bookings', 'stat-total-revenue', 'admin-bookings-table'],
        'invoice.html': ['invoice-card', 'invoice-num']
    } : {
        'index.html': ['health-status', 'services-grid'],
        'login.html': ['login-form', 'register-form', 'auth-error', 'auth-success', 'login-email', 'login-password', 'reg-name', 'reg-email', 'reg-password', 'reg-role', 'logout-btn'],
        'request.html': ['request-form', 'req-category', 'req-date', 'req-urgency', 'req-address', 'req-description', 'req-phone', 'req-image', 'btn-find', 'match-panel', 'match-count', 'match-loading', 'match-empty', 'match-list', 'match-success', 'req-id', 'btn-view-tracking', 'btn-book-another', 'slot-modal'],
        'tracking.html': ['role-warning', 'tracking-view', 'requests-count', 'request-list', 'request-detail', 'timeline', 'notif-bell', 'notif-count', 'notif-panel', 'notif-list', 'notif-mark-all', 'logout-btn', 'ratingModal'],
        'provider.html': ['role-warning', 'provider-view', 'tab-incoming', 'incoming-count', 'tab-active', 'tab-history', 'requests-grid', 'notif-bell', 'notif-count', 'notif-panel', 'logout-btn'],
        'invoice.html': ['invoice-status', 'invoice-content', 'inv-number', 'inv-date', 'cust-name', 'cust-phone', 'cust-address', 'prov-name', 'prov-phone', 'prov-address', 'inv-desc', 'inv-subtotal', 'inv-calc-subtotal', 'inv-tax', 'inv-total']
    };

    for (const [page, ids] of Object.entries(requiredHooks)) {
        const content = fs.readFileSync(path.join(__dirname, 'client', page), 'utf8');
        for (const id of ids) {
            assert(content.includes(`id="${id}"`), `${page} preserves required id="${id}"`);
        }
    }

    // --------------------------------------------------------
    // Part 5: Functional Server Smoke Tests
    // --------------------------------------------------------
    console.log('\n--- Part 5: Functional Server Smoke Tests ---');

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
        for (const hf of htmlFiles) {
            const res = await makeRequest(`/${hf === 'index.html' ? '' : hf}`);
            assert(res.status === 200, `GET /${hf} returns 200 OK`);
        }

        // Smoke CSS
        const cssRes = await makeRequest(isLegacy ? '/global.css' : '/css/tokens.css');
        assert(cssRes.status === 200, `GET ${isLegacy ? '/global.css' : '/css/tokens.css'} returns 200 OK`);

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

        // Auth login customer
        const loginRes = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
        });
        assert(loginRes.status === 200, 'POST /api/auth/login demo customer returns 200 OK');
        const rawCookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'][0] : '';
        const customerCookie = rawCookie.split(';')[0];
        assert(customerCookie.includes('hutfix_token'), 'Login sets hutfix_token cookie');

        // Next Saturday date for provider availability
        const nextSatDate = (() => {
            const d = new Date();
            const day = d.getUTCDay();
            let diff = (6 - day + 7) % 7;
            if (diff === 0) diff = 7;
            d.setUTCDate(d.getUTCDate() + diff);
            return d.toISOString().split('T')[0];
        })();

        // Matching API with cookie
        const matchRes = await makeRequest('/api/requests/match', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Cookie': customerCookie
            },
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
        assert(matchBody.ok === true && Array.isArray(matchBody.candidates), 'Matching returns ranked candidate specialists');
    } finally {
        try { serverProcess.kill('SIGTERM'); } catch (_) {}
    }

    // --------------------------------------------------------
    // Part 6: Full Regression Suite (Phases 0 through 7)
    // --------------------------------------------------------
    console.log('\n--- Part 6: Running Full Regression Suite (Phases 0-7) ---');

    if (!process.env.SKIP_NESTED_REGRESSION) {
        for (let p = 0; p <= 7; p++) {
            const testFile = `test_phase${p}.js`;
            console.log(`\n>>> Running regression: ${testFile}...`);
            try {
                execSync(`node ${testFile}`, { stdio: 'inherit', cwd: __dirname, env: { ...process.env, SKIP_NESTED_REGRESSION: '1' } });
                assert(true, `Regression suite ${testFile} exited 0`);
            } catch (e) {
                assert(false, `Regression suite ${testFile} failed`);
            }
        }
    } else {
        console.log('[INFO] Nested regression skipped via SKIP_NESTED_REGRESSION');
    }

    // --------------------------------------------------------
    // Final Summary
    // --------------------------------------------------------
    console.log('\n====================================================');
    console.log(`PHASE 8 TEST RESULTS: PASS ${passCount} / FAIL ${failCount}`);
    console.log('====================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
});
