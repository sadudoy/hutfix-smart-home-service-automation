/**
 * Phase 9 Verification Test Suite — Contrast Bugfix + Teal/Slate Brand Palette
 *
 * Verifies:
 * 1. Token Contrast Computation (WCAG ratios for light and dark themes).
 * 2. Typography Reset (Google Fonts link, font tokens, zero legacy font references).
 * 3. Login Page Regression (jargon eliminated, photo present, no inline color styles).
 * 4. Universal Hardcoded-Color Ban (components.css, pages.css, all HTML pages).
 * 5. Functional Server Smoke Tests (health, services, static pages, demo customer login).
 * 6. Full Regression Suite (Phases 0 through 8 exit 0).
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

console.log('====================================================');
console.log('   PHASE 9: CONTRAST BUGFIX & TEAL/SLATE PALETTE    ');
console.log('====================================================\n');

// Contrast helper functions
function parseHex(hex) {
    hex = hex.replace('#', '').trim();
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

async function runTests() {
    // --------------------------------------------------------
    // Part 1: Token Contrast Computation (Programmatic)
    // --------------------------------------------------------
    console.log('--- Part 1: Token Contrast Computation ---');

    const tokensPath = path.join(__dirname, 'client', 'css', 'tokens.css');
    assert(fs.existsSync(tokensPath), 'client/css/tokens.css exists');
    const tokensContent = fs.readFileSync(tokensPath, 'utf8');

    const rootBlockMatch = tokensContent.match(/:root\s*\{([^}]+)\}/);
    const darkBlockMatch = tokensContent.match(/\[data-theme=["']dark["']\]\s*\{([^}]+)\}/);
    assert(rootBlockMatch && darkBlockMatch, 'tokens.css contains :root and [data-theme="dark"] blocks');

    function parseTokens(block) {
        const tokens = {};
        for (const line of block.split('\n')) {
            const m = line.trim().match(/^(--[\w-]+)\s*:\s*([^;]+);/);
            if (m) {
                // Strip comments
                const val = m[2].split('/*')[0].trim();
                tokens[m[1]] = val;
            }
        }
        return tokens;
    }

    const rootTokens = parseTokens(rootBlockMatch[1]);
    const darkTokens = parseTokens(darkBlockMatch[1]);

    // Token presence check
    const requiredKeys = ['--text', '--bg', '--surface', '--text-muted', '--text-subtle', '--accent', '--accent-text', '--border'];
    for (const key of requiredKeys) {
        assert(rootTokens[key], `Light token ${key} defined (${rootTokens[key]})`);
        assert(darkTokens[key], `Dark token ${key} defined (${darkTokens[key]})`);
    }

    // Light Theme Contrast Assertions
    console.log('\n[Light Theme Contrast Calculations]');
    const lightTextBg = contrast(rootTokens['--text'], rootTokens['--bg']);
    assert(lightTextBg >= 7.0, `Light --text vs --bg >= 7.0 (AAA) (measured ${lightTextBg.toFixed(2)})`);

    const lightTextSurface = contrast(rootTokens['--text'], rootTokens['--surface']);
    assert(lightTextSurface >= 7.0, `Light --text vs --surface >= 7.0 (AAA) (measured ${lightTextSurface.toFixed(2)})`);

    const lightMutedBg = contrast(rootTokens['--text-muted'], rootTokens['--bg']);
    assert(lightMutedBg >= 4.5, `Light --text-muted vs --bg >= 4.5 (AA) (measured ${lightMutedBg.toFixed(2)})`);

    const lightMutedSurface = contrast(rootTokens['--text-muted'], rootTokens['--surface']);
    assert(lightMutedSurface >= 4.5, `Light --text-muted vs --surface >= 4.5 (AA) (measured ${lightMutedSurface.toFixed(2)})`);

    const lightSubtleBg = contrast(rootTokens['--text-subtle'], rootTokens['--bg']);
    assert(lightSubtleBg >= 3.0, `Light --text-subtle vs --bg >= 3.0 (measured ${lightSubtleBg.toFixed(2)})`);

    const lightAccentText = contrast(rootTokens['--accent-text'], rootTokens['--accent']);
    assert(lightAccentText >= 4.5, `Light --accent-text vs --accent >= 4.5 (measured ${lightAccentText.toFixed(2)})`);

    const lightBorderSurface = contrast(rootTokens['--border'], rootTokens['--surface']);
    assert(lightBorderSurface >= 1.5, `Light --border vs --surface >= 1.5 (measured ${lightBorderSurface.toFixed(2)})`);

    // Dark Theme Contrast Assertions
    console.log('\n[Dark Theme Contrast Calculations]');
    const darkTextBg = contrast(darkTokens['--text'], darkTokens['--bg']);
    assert(darkTextBg >= 7.0, `Dark --text vs --bg >= 7.0 (AAA) (measured ${darkTextBg.toFixed(2)})`);

    const darkTextSurface = contrast(darkTokens['--text'], darkTokens['--surface']);
    assert(darkTextSurface >= 7.0, `Dark --text vs --surface >= 7.0 (AAA) (measured ${darkTextSurface.toFixed(2)})`);

    const darkMutedBg = contrast(darkTokens['--text-muted'], darkTokens['--bg']);
    assert(darkMutedBg >= 4.5, `Dark --text-muted vs --bg >= 4.5 (AA) (measured ${darkMutedBg.toFixed(2)})`);

    const darkMutedSurface = contrast(darkTokens['--text-muted'], darkTokens['--surface']);
    assert(darkMutedSurface >= 4.5, `Dark --text-muted vs --surface >= 4.5 (AA) (measured ${darkMutedSurface.toFixed(2)})`);

    const darkSubtleBg = contrast(darkTokens['--text-subtle'], darkTokens['--bg']);
    assert(darkSubtleBg >= 3.0, `Dark --text-subtle vs --bg >= 3.0 (measured ${darkSubtleBg.toFixed(2)})`);

    const darkAccentText = contrast(darkTokens['--accent-text'], darkTokens['--accent']);
    assert(darkAccentText >= 4.5, `Dark --accent-text vs --accent >= 4.5 (measured ${darkAccentText.toFixed(2)})`);

    const darkBorderSurface = contrast(darkTokens['--border'], darkTokens['--surface']);
    assert(darkBorderSurface >= 1.5, `Dark --border vs --surface >= 1.5 (measured ${darkBorderSurface.toFixed(2)})`);

    // --------------------------------------------------------
    // Part 2: Typography Loading & Banned Font Checks
    // --------------------------------------------------------
    console.log('\n--- Part 2: Typography Loading & Hygiene ---');

    const htmlFiles = ['index.html', 'login.html', 'request.html', 'tracking.html', 'provider.html', 'invoice.html'];
    for (const hf of htmlFiles) {
        const filePath = path.join(__dirname, 'client', hf);
        const html = fs.readFileSync(filePath, 'utf8');

        assert(html.includes('family=Instrument+Serif') && html.includes('family=Geist'), `${hf} contains Instrument+Serif and Geist in Google Fonts <link>`);
        assert(!/Manrope/i.test(html), `${hf} does not reference Manrope`);
        assert(!/Plus\+Jakarta/i.test(html), `${hf} does not reference Plus Jakarta`);
        assert(!/Inter\+Tight/i.test(html), `${hf} does not reference Inter Tight`);
    }

    assert(tokensContent.includes("'Instrument Serif'"), "tokens.css defines --font-display with 'Instrument Serif'");
    assert(tokensContent.includes("'Geist'"), "tokens.css defines --font-body with 'Geist'");
    assert(!/Manrope/i.test(tokensContent), 'tokens.css does not reference Manrope');
    assert(!/Plus\+Jakarta/i.test(tokensContent), 'tokens.css does not reference Plus Jakarta');

    // --------------------------------------------------------
    // Part 3: Login Page Bug Regression & Content Checks
    // --------------------------------------------------------
    console.log('\n--- Part 3: Login Page Bug Regression ---');

    const loginHtml = fs.readFileSync(path.join(__dirname, 'client', 'login.html'), 'utf8');
    assert(!loginHtml.includes('Advisory locks'), 'client/login.html does not contain developer jargon "Advisory locks"');
    assert(!loginHtml.includes('Live dispatch stepper'), 'client/login.html does not contain jargon "Live dispatch stepper"');
    assert(loginHtml.includes('8 services, 11 verified pros in Dhaka'), 'client/login.html has plain customer benefit bullet 1');
    assert(loginHtml.includes('Pick a time, we hold it — no double bookings'), 'client/login.html has plain customer benefit bullet 2');
    assert(loginHtml.includes('Track every visit from arrival to done'), 'client/login.html has plain customer benefit bullet 3');

    assert(/<img\s+[^>]*id=["']auth-hero-img["']/i.test(loginHtml) || /<img\s+[^>]*alt=["']Home service["']/i.test(loginHtml), 'client/login.html contains photograph in left panel');
    assert(!/style\s*=\s*["'][^"']*color\s*:/i.test(loginHtml), 'client/login.html has zero inline style="color: attributes');

    const loginIds = [
        'login-form', 'register-form', 'auth-success', 'auth-error',
        'who', 'role', 'logout-btn', 'goto-dashboard',
        'login-email', 'login-password', 'reg-name', 'reg-email',
        'reg-phone', 'reg-password', 'reg-role', 'current-session', 'theme-toggle'
    ];
    for (const id of loginIds) {
        assert(loginHtml.includes(`id="${id}"`), `client/login.html preserves id="${id}"`);
    }

    // --------------------------------------------------------
    // Part 4: Universal Hardcoded-Color Ban
    // --------------------------------------------------------
    console.log('\n--- Part 4: Universal Hardcoded-Color Ban ---');

    const cssFiles = ['components.css', 'pages.css'];
    for (const cf of cssFiles) {
        const cssPath = path.join(__dirname, 'client', 'css', cf);
        const content = fs.readFileSync(cssPath, 'utf8');
        const lines = content.split('\n');
        let violations = 0;
        lines.forEach((line, idx) => {
            // Check for color: #[hex] outside of var(..., #hex)
            if (/color\s*:\s*#[0-9a-fA-F]{3,6}/i.test(line)) {
                if (!/var\([^)]*#[0-9a-fA-F]{3,6}/i.test(line)) {
                    violations++;
                    console.error(`Violation in ${cf}:${idx + 1}: ${line.trim()}`);
                }
            }
        });
        assert(violations === 0, `${cf} has zero literal hex colors outside var() fallbacks (found ${violations})`);
    }

    for (const hf of htmlFiles) {
        const filePath = path.join(__dirname, 'client', hf);
        const html = fs.readFileSync(filePath, 'utf8');
        const hasInlineColor = /style\s*=\s*["'][^"']*color\s*:/i.test(html);
        assert(!hasInlineColor, `${hf} has zero inline style="...color:..." declarations`);
    }

    // --------------------------------------------------------
    // Part 5: Functional Server Smoke Tests
    // --------------------------------------------------------
    console.log('\n--- Part 5: Functional Server Smoke Tests ---');

    const testPort = 5998;
    const serverProcess = spawn('node', ['server/index.js'], {
        env: Object.assign({}, process.env, { PORT: testPort }),
        stdio: 'pipe'
    });

    await new Promise((resolve) => {
        let stdout = '';
        serverProcess.stdout.on('data', chunk => {
            stdout += chunk.toString();
            if (stdout.includes('running on port') || stdout.includes(testPort.toString())) {
                resolve();
            }
        });
        setTimeout(resolve, 3000);
    });

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
        const rootRes = await makeRequest('/');
        assert(rootRes.status === 200, 'GET / returns 200 OK');

        const loginRes = await makeRequest('/login.html');
        assert(loginRes.status === 200, 'GET /login.html returns 200 OK');

        const servicesRes = await makeRequest('/api/services');
        assert(servicesRes.status === 200, 'GET /api/services returns 200 OK');
        const servicesBody = JSON.parse(servicesRes.body);
        assert(servicesBody.ok === true && servicesBody.services.length === 8, 'Services endpoint returns 8 categories');

        const healthRes = await makeRequest('/api/health');
        assert(healthRes.status === 200, 'GET /api/health returns 200 OK');
        const healthBody = JSON.parse(healthRes.body);
        assert(healthBody.ok === true && healthBody.db === 'connected', 'Health returns ok: true, db: connected');

        const authLoginRes = await makeRequest('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
        });
        assert(authLoginRes.status === 200, 'POST /api/auth/login demo customer returns 200 OK');
        const setCookie = authLoginRes.headers['set-cookie'] ? authLoginRes.headers['set-cookie'][0] : '';
        assert(setCookie.includes('hutfix_token'), 'Login sets hutfix_token cookie');
    } finally {
        serverProcess.kill('SIGTERM');
    }

    // --------------------------------------------------------
    // Part 6: Full Regression Suite (Phases 0 through 8)
    // --------------------------------------------------------
    console.log('\n--- Part 6: Running Full Regression Suite (Phases 0-8) ---');

    for (let p = 0; p <= 8; p++) {
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
    console.log(`PHASE 9 TEST RESULTS: PASS ${passCount} / FAIL ${failCount} / SKIP ${skipCount}`);
    console.log('====================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTests().catch(err => {
    console.error('Unhandled test suite error:', err);
    process.exit(1);
});
