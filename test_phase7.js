/**
 * Phase 7 Verification Test Suite — Design System + Public Pages Overhaul
 *
 * Verifies:
 * 1. Static assertions (tokens.css, components.css, pages.css, theme.js, HTML pages, accessibility, IDs).
 * 2. Functional smoke tests (Express static serving of new assets, pages, and untouched APIs).
 * 3. Full regression suite (Phases 0 through 6 exit 0).
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
console.log('   PHASE 7: DESIGN SYSTEM & PUBLIC PAGES OVERHAUL   ');
console.log('====================================================\n');

async function runTests() {
    // --------------------------------------------------------
    // Part A: Static Assertions
    // --------------------------------------------------------
    console.log('--- Part A: Static File & Content Assertions ---');

    // 1. File existence
    const pagesCssPath = path.join(__dirname, 'client', 'css', 'pages.css');
    const themeJsPath = path.join(__dirname, 'client', 'js', 'theme.js');
    assert(fs.existsSync(pagesCssPath), 'client/css/pages.css exists');
    assert(fs.existsSync(themeJsPath), 'client/js/theme.js exists');

    // 2. tokens.css contents
    const tokensContent = fs.readFileSync(path.join(__dirname, 'client', 'css', 'tokens.css'), 'utf8');
    const tokenTokens = [
        ['--accent-gradient', '--accent'],
        ['--brand-500', '--brand-600'],
        ['--glass-bg', '--surface'],
        ['--radius-lg', '--radius-lg'],
        ['--font-display', '--font-display'],
        ['[data-theme="dark"]', '[data-theme="dark"]']
    ];
    for (const [t7, t8] of tokenTokens) {
        assert(tokensContent.includes(t7) || tokensContent.includes(t8), `tokens.css contains ${t7} or ${t8}`);
    }

    // 3. components.css contents
    const compContent = fs.readFileSync(path.join(__dirname, 'client', 'css', 'components.css'), 'utf8');
    const compClasses = [
        '.app-nav', '.btn-brand', '.hero', '.hero__title', '.category-card',
        '.auth-shell', '.theme-toggle', '.form-control-lg', '.footer', '.skeleton', '.chip'
    ];
    for (const c of compClasses) {
        assert(compContent.includes(c), `components.css contains ${c}`);
    }

    // 4. pages.css contents
    const pagesContent = fs.readFileSync(pagesCssPath, 'utf8');
    const pageRules = [
        '.page-landing .trust-strip',
        '.page-login .auth-shell',
        '.page-request .request-grid',
        '@media (max-width: 992px)',
        '@media (max-width: 576px)'
    ];
    for (const r of pageRules) {
        assert(pagesContent.includes(r), `pages.css contains ${r}`);
    }

    // 5. theme.js contents
    const themeContent = fs.readFileSync(themeJsPath, 'utf8');
    const themeKeywords = ['data-theme', 'localStorage', 'HutTheme', 'theme-toggle'];
    for (const k of themeKeywords) {
        assert(themeContent.includes(k), `theme.js contains ${k}`);
    }

    // 6. index.html contents
    const indexContent = fs.readFileSync(path.join(__dirname, 'client', 'index.html'), 'utf8');
    const indexMarkers = [
        'page-landing', 'app-nav', 'theme-toggle', 'hero__title',
        'services-grid', 'id="health-status"', 'IMAGES.category('
    ];
    for (const m of indexMarkers) {
        assert(indexContent.includes(m), `index.html contains ${m}`);
    }
    assert(indexContent.includes('Plus+Jakarta+Sans') || indexContent.includes('Manrope'), 'index.html contains Plus+Jakarta+Sans or Manrope font');

    // 7. login.html contents
    const loginContent = fs.readFileSync(path.join(__dirname, 'client', 'login.html'), 'utf8');
    const loginMarkers = [
        'page-login', 'auth-shell', 'auth-shell__brand', 'login-form',
        'register-form', 'auth-success', 'auth-error', 'who', 'role',
        'logout-btn', 'theme-toggle'
    ];
    for (const m of loginMarkers) {
        assert(loginContent.includes(m), `login.html contains ${m}`);
    }

    // 8. request.html contents
    const reqContent = fs.readFileSync(path.join(__dirname, 'client', 'request.html'), 'utf8');
    const reqMarkers = [
        'page-request', 'request-grid', 'match-panel', 'slot-modal',
        'req-category', 'req-image', 'match-list', 'match-empty', 'theme-toggle'
    ];
    for (const m of reqMarkers) {
        assert(reqContent.includes(m), `request.html contains ${m}`);
    }

    // 9. tracking, provider, invoice wire-in
    const trackingContent = fs.readFileSync(path.join(__dirname, 'client', 'tracking.html'), 'utf8');
    const providerContent = fs.readFileSync(path.join(__dirname, 'client', 'provider.html'), 'utf8');
    const invoiceContent = fs.readFileSync(path.join(__dirname, 'client', 'invoice.html'), 'utf8');

    assert(trackingContent.includes('/js/theme.js') && trackingContent.includes('theme-toggle'), 'tracking.html includes theme.js and theme-toggle');
    assert(providerContent.includes('/js/theme.js') && providerContent.includes('theme-toggle'), 'provider.html includes theme.js and theme-toggle');
    assert(invoiceContent.includes('/js/theme.js') && invoiceContent.includes('theme-toggle'), 'invoice.html includes theme.js and theme-toggle');

    // 10. Accessibility: aria-label on every .theme-toggle in all html files
    const allHtmlFiles = ['index.html', 'login.html', 'request.html', 'tracking.html', 'provider.html', 'invoice.html'];
    let allTogglesHaveAria = true;
    for (const file of allHtmlFiles) {
        const fileText = fs.readFileSync(path.join(__dirname, 'client', file), 'utf8');
        // match any tag containing class with theme-toggle
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

    // 11. Image accessibility: Every <img> in index.html has alt= attribute
    const imgMatches = indexContent.match(/<img\b[^>]*>/gi) || [];
    let allImgsHaveAlt = true;
    for (const imgTag of imgMatches) {
        if (!imgTag.includes('alt=')) {
            allImgsHaveAlt = false;
            console.error(`Missing alt attribute on img in index.html: ${imgTag}`);
        }
    }
    assert(imgMatches.length > 0 && allImgsHaveAlt, `All ${imgMatches.length} <img> tags in index.html have alt attribute`);

    // 12. Viewport meta tag and lang="en" on index, login, request
    const checkPages = [
        { name: 'index.html', content: indexContent },
        { name: 'login.html', content: loginContent },
        { name: 'request.html', content: reqContent }
    ];
    for (const p of checkPages) {
        assert(p.content.includes('<html lang="en">'), `${p.name} has <html lang="en">`);
        assert(p.content.includes('name="viewport"'), `${p.name} has mobile viewport meta tag`);
    }

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
        // Clean occupied port if any
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
        assert(serverReady, 'Server spawned and healthy on /api/health');

        // Test GET /
        const landingRes = await fetch(`${baseUrl}/`);
        const landingText = await landingRes.text();
        assert(landingRes.status === 200 && landingText.includes('page-landing'), 'GET / returns 200 and contains page-landing');

        // Test GET /login.html
        const loginRes = await fetch(`${baseUrl}/login.html`);
        const loginText = await loginRes.text();
        assert(loginRes.status === 200 && loginText.includes('auth-shell'), 'GET /login.html returns 200 and contains auth-shell');

        // Test GET /request.html
        const reqRes = await fetch(`${baseUrl}/request.html`);
        const reqText = await reqRes.text();
        assert(reqRes.status === 200 && reqText.includes('match-panel'), 'GET /request.html returns 200 and contains match-panel');

        // Test GET /css/pages.css
        const pagesCssRes = await fetch(`${baseUrl}/css/pages.css`);
        const contentTypeCss = pagesCssRes.headers.get('content-type') || '';
        assert(pagesCssRes.status === 200 && contentTypeCss.includes('text/css'), 'GET /css/pages.css returns 200 with text/css');

        // Test GET /js/theme.js
        const themeJsRes = await fetch(`${baseUrl}/js/theme.js`);
        const themeJsText = await themeJsRes.text();
        assert(themeJsRes.status === 200 && themeJsText.includes('HutTheme'), 'GET /js/theme.js returns 200 and contains HutTheme');

        // Test GET /api/services (backend untouched)
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

        // Test GET /api/health
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

    for (const reg of regressions) {
        try {
            console.log(`\n>>> Running regression: ${reg}...`);
            execSync(`node ${reg}`, { stdio: 'inherit', cwd: __dirname });
            assert(true, `Regression suite ${reg} exited 0`);
        } catch (err) {
            assert(false, `Regression suite ${reg} failed`, err.message);
        }
    }

    // Final summary
    console.log('\n====================================================');
    console.log(`PHASE 7 TEST RESULTS: PASS ${passCount} / FAIL ${failCount} / SKIP ${skipCount}`);
    console.log('====================================================');

    if (failCount > 0) {
        process.exit(1);
    }
}

runTests();
