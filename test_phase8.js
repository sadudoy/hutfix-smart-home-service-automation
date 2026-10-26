/**
 * Phase 8 Verification Test Suite — Impeccable-Driven Redesign + Dark-Mode Hardening
 *
 * Verifies:
 * 1. Product Truth & Detector Assertions (PRODUCT.md, detect-before.json, detect-after.json).
 * 2. Theme & Token Symmetry & Contrast Hardening (tokens.css, color-scheme, symmetry, WCAG contrast).
 * 3. Detector-Clean CSS & Markup (zero hex in components/pages.css, zero inline style color/bg, zero element.style in JS).
 * 4. DOM Hook Integrity (all JS-referenced IDs preserved across 6 pages).
 * 5. Functional Smoke Tests (Express static serving, API endpoints, auth, match).
 * 6. Full Regression Suite (Phases 0 through 7 exit 0).
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
    // Part 2: Theme, Tokens & Contrast Calculations
    // --------------------------------------------------------
    console.log('\n--- Part 2: Theme, Tokens & Dark Mode Parity ---');

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

    // Contrast calculations
    function parseHex(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        const num = parseInt(hex, 16);
        return [num >> 16, (num >> 8) & 255, num & 255];
    }
    function relLum([r, g, b]) {
        const [rs, gs, bs] = [r, g, b].map(c => {
            const s = c / 255;
            return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
    }
    function contrast(hex1, hex2) {
        const l1 = relLum(parseHex(hex1));
        const l2 = relLum(parseHex(hex2));
        const bright = Math.max(l1, l2);
        const dark = Math.min(l1, l2);
        return (bright + 0.05) / (dark + 0.05);
    }

    // Light contrast assertions
    const bgLight = rootTokens['--bg'];
    const textLight = rootTokens['--text'];
    const mutedLight = rootTokens['--text-muted'];
    const btnBgLight = rootTokens['--brand-600'];
    const btnTextLight = rootTokens['--brand-text'];
    const borderLight = rootTokens['--border'];
    const surfaceLight = rootTokens['--surface'];

    assert(contrast(textLight, bgLight) >= 7.0, `Light body text contrast >= 7:1 (got ${contrast(textLight, bgLight).toFixed(2)})`);
    assert(contrast(mutedLight, bgLight) >= 4.5, `Light muted text contrast >= 4.5:1 (got ${contrast(mutedLight, bgLight).toFixed(2)})`);
    assert(contrast(btnTextLight, btnBgLight) >= 4.5, `Light button text contrast >= 4.5:1 (got ${contrast(btnTextLight, btnBgLight).toFixed(2)})`);
    assert(contrast(borderLight, surfaceLight) >= 1.5, `Light border contrast >= 1.5:1 (got ${contrast(borderLight, surfaceLight).toFixed(2)})`);

    // Dark contrast assertions
    const bgDark = darkTokens['--bg'];
    const textDark = darkTokens['--text'];
    const mutedDark = darkTokens['--text-muted'];
    const btnBgDark = darkTokens['--brand-600'];
    const btnTextDark = darkTokens['--brand-text'];
    const borderDark = darkTokens['--border'];
    const surfaceDark = darkTokens['--surface'];

    assert(contrast(textDark, bgDark) >= 7.0, `Dark body text contrast >= 7:1 (got ${contrast(textDark, bgDark).toFixed(2)})`);
    assert(contrast(mutedDark, bgDark) >= 4.5, `Dark muted text contrast >= 4.5:1 (got ${contrast(mutedDark, bgDark).toFixed(2)})`);
    assert(contrast(btnTextDark, btnBgDark) >= 4.5, `Dark button text contrast >= 4.5:1 (got ${contrast(btnTextDark, btnBgDark).toFixed(2)})`);
    assert(contrast(borderDark, surfaceDark) >= 1.5, `Dark border contrast >= 1.5:1 (got ${contrast(borderDark, surfaceDark).toFixed(2)})`);

    // --------------------------------------------------------
    // Part 3: Detector-Clean CSS & Zero-Inline-Style Checks
    // --------------------------------------------------------
    console.log('\n--- Part 3: CSS Cleanliness & Zero Inline Style Colors ---');

    const cssFiles = ['client/css/components.css', 'client/css/pages.css'];
    const bannedPatterns = [
        'backdrop-filter',
        'accent-gradient',
        'translateY(-4px)',
        'translateY(-1px)',
        '#6366f1',
        '#8b5cf6',
        '#7c3aed',
        'text-fill-color',
        'Plus+Jakarta',
        'Inter:wght'
    ];

    for (const f of cssFiles) {
        const content = fs.readFileSync(path.join(__dirname, f), 'utf8');
        const hexes = content.match(/#[0-9a-fA-F]{3,8}\b/g) || [];
        assert(hexes.length === 0, `${f} has zero literal hex colors (found: ${hexes.join(', ') || 'none'})`);

        const rgbHsl = content.match(/\b(rgb|hsl|oklch)\s*\(/g) || [];
        assert(rgbHsl.length === 0, `${f} has zero rgb/hsl/oklch functions`);

        for (const bp of bannedPatterns) {
            assert(!content.includes(bp), `${f} does not contain banned pattern "${bp}"`);
        }
    }

    // Check all HTML files for inline style colors
    const htmlFiles = ['index.html', 'login.html', 'request.html', 'tracking.html', 'provider.html', 'invoice.html'];
    for (const hf of htmlFiles) {
        const fullPath = path.join(__dirname, 'client', hf);
        assert(fs.existsSync(fullPath), `client/${hf} exists`);
        const content = fs.readFileSync(fullPath, 'utf8');

        // Verify theme.js in head
        assert(/<head>[\s\S]*<script src="\/js\/theme\.js"><\/script>[\s\S]*<\/head>/.test(content), `${hf} includes /js/theme.js in <head>`);
        // Verify meta theme-color
        assert(content.includes('<meta name="theme-color"'), `${hf} has <meta name="theme-color">`);
        // Verify theme-toggle button
        assert(content.includes('theme-toggle'), `${hf} has theme-toggle button`);

        // Check for style="...color|background..."
        const lines = content.split('\n');
        let inlineColorMatches = [];
        lines.forEach((line, idx) => {
            if (/style=["'][^"']*(color|background)/i.test(line)) {
                inlineColorMatches.push(`L${idx + 1}`);
            }
        });
        assert(inlineColorMatches.length === 0, `${hf} has zero inline style color/background (found at: ${inlineColorMatches.join(', ') || 'none'})`);
    }

    // Check JS files for .style.color or .style.background
    const jsFiles = fs.readdirSync(path.join(__dirname, 'client', 'js')).filter(f => f.endsWith('.js'));
    for (const jf of jsFiles) {
        const content = fs.readFileSync(path.join(__dirname, 'client', 'js', jf), 'utf8');
        assert(!content.includes('.style.color'), `client/js/${jf} does not assign .style.color`);
        assert(!content.includes('.style.background'), `client/js/${jf} does not assign .style.background`);
    }

    // --------------------------------------------------------
    // Part 4: DOM Hook Integrity Checks
    // --------------------------------------------------------
    console.log('\n--- Part 4: DOM Hook Integrity Checks ---');

    const requiredHooks = {
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

    const testPort = 3018;
    const serverProcess = spawn('node', ['server/index.js'], {
        env: { ...process.env, PORT: testPort, NODE_ENV: 'test' },
        stdio: 'pipe'
    });

    let serverStderr = '';
    serverProcess.stderr.on('data', d => serverStderr += d.toString());

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
        // Smoke all 6 HTML pages
        for (const hf of htmlFiles) {
            const res = await makeRequest(`/${hf === 'index.html' ? '' : hf}`);
            assert(res.status === 200, `GET /${hf} returns 200 OK`);
        }

        // Smoke static assets
        const cssRes = await makeRequest('/css/tokens.css');
        assert(cssRes.status === 200, 'GET /css/tokens.css returns 200 OK');

        const themeRes = await makeRequest('/js/theme.js');
        assert(themeRes.status === 200, 'GET /js/theme.js returns 200 OK');

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
        serverProcess.kill('SIGTERM');
    }

    // --------------------------------------------------------
    // Part 6: Full Regression Suite (Phases 0 through 7)
    // --------------------------------------------------------
    console.log('\n--- Part 6: Running Full Regression Suite (Phases 0-7) ---');

    for (let p = 0; p <= 7; p++) {
        const testFile = `test_phase${p}.js`;
        console.log(`\n>>> Running regression: ${testFile}...`);
        try {
            execSync(`node ${testFile}`, { stdio: 'inherit' });
            assert(true, `Regression suite ${testFile} exited 0`);
        } catch (e) {
            assert(false, `Regression suite ${testFile} failed`);
        }
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
