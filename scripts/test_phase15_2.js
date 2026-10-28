const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { app, startServer } = require('../server/index');
const { pool } = require('../server/config/db');

async function runTests() {
  const server = await startServer();
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Testing Phase 15.2 at ${baseUrl}...`);

  async function req(url, options = {}) {
    options.credentials = 'include';
    const res = await fetch(`${baseUrl}${url}`, options);
    const data = await res.json().catch(() => ({}));
    return { res, data, cookies: res.headers.get('set-cookie') };
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Admin Reports & Analytics Page & Endpoints
    // ----------------------------------------------------
    console.log('[Test 1] Testing Admin Reports & Analytics...');

    // 1.1 Check static files
    const htmlRes = await fetch(`${baseUrl}/admin-reports.html`);
    assert.strictEqual(htmlRes.status, 200, 'admin-reports.html should be served');
    const htmlText = await htmlRes.text();
    assert.ok(htmlText.includes('id="app-content"'), 'admin-reports.html should contain #app-content');
    assert.ok(htmlText.includes('id="weeklyBarChart"'), 'admin-reports.html should contain #weeklyBarChart');

    const jsRes = await fetch(`${baseUrl}/js/admin-reports.js`);
    assert.strictEqual(jsRes.status, 200, 'admin-reports.js should be served');

    // 1.2 Admin login & stats query
    const adminLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.test', password: 'demo1234' })
    });
    assert.strictEqual(adminLogin.res.status, 200);
    const adminCookie = adminLogin.cookies.split(';')[0];

    const statsRes = await req('/api/admin/stats', { headers: { Cookie: adminCookie } });
    assert.strictEqual(statsRes.res.status, 200);
    assert.ok(statsRes.data.stats, 'Stats object should exist');

    const bookingsRes = await req('/api/admin/bookings?limit=50', { headers: { Cookie: adminCookie } });
    assert.strictEqual(bookingsRes.res.status, 200);
    assert.ok(Array.isArray(bookingsRes.data.bookings), 'Bookings should be an array');
    console.log('  -> Admin reports and analytics endpoints verified.');

    // ----------------------------------------------------
    // TEST 2: Provider Profile API & Media URLs
    // ----------------------------------------------------
    console.log('[Test 2] Testing Provider Profile API...');
    const provLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'provider@demo.test', password: 'demo1234' })
    });
    assert.strictEqual(provLogin.res.status, 200);
    const provCookie = provLogin.cookies.split(';')[0];

    const provProfileRes = await req(`/api/providers/${provLogin.data.user.id}/profile`, {
      headers: { Cookie: provCookie }
    });
    assert.strictEqual(provProfileRes.res.status, 200);
    assert.ok('logo_url' in provProfileRes.data.provider, 'Provider profile should contain logo_url');
    assert.ok('banner_url' in provProfileRes.data.provider, 'Provider profile should contain banner_url');
    console.log('  -> Provider profile returns logo_url & banner_url.');

    // ----------------------------------------------------
    // TEST 3: CSS Assertions (Print, Sidebar, Avatars, Modal)
    // ----------------------------------------------------
    console.log('[Test 3] Verifying CSS Rules in client/css/style.css...');
    const css = fs.readFileSync(path.join(__dirname, '..', 'client', 'css', 'style.css'), 'utf8');

    // 3.1 Invoice Print Area
    assert.ok(css.includes('.invoice-print-area, .invoice-print-area * { visibility: visible; }'), 'Missing print area visibility rule');
    assert.ok(css.includes('.invoice-print-area {'), 'Missing .invoice-print-area rule');
    assert.ok(css.includes('.sidebar, .topbar, .no-print, button { display: none !important; }'), 'Missing print hide rule');

    // 3.2 Sidebar scrollbar removal
    assert.ok(css.includes('scrollbar-width: none;'), 'Missing scrollbar-width: none');
    assert.ok(css.includes('.sidebar::-webkit-scrollbar { display: none;'), 'Missing webkit-scrollbar display none');

    // 3.3 Perfect Circle Avatars
    assert.ok(css.includes('.avatar, .provider-avatar, .profile-banner img.avatar'), 'Missing avatar circle selector');
    assert.ok(css.includes('border-radius: 50% !important;'), 'Missing border-radius 50% !important');
    assert.ok(css.includes('aspect-ratio: 1 / 1;'), 'Missing aspect-ratio: 1 / 1');

    // 3.4 Modal overflow
    assert.ok(css.includes('.modal-body, #modalBody {'), 'Missing .modal-body overflow rule');
    assert.ok(css.includes('overflow-x: hidden;'), 'Missing overflow-x: hidden');
    assert.ok(css.includes('max-width: 600px;'), 'Missing modal max-width: 600px');

    console.log('  -> All CSS rules successfully verified.');

    // ----------------------------------------------------
    // TEST 4: Zero Emoji Scan
    // ----------------------------------------------------
    console.log('[Test 4] Scanning for 0 Emojis in Project...');
    const emojiRegex = /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;

    function walk(dir) {
      let results = [];
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        if (file === 'node_modules' || file === '.git' || file === '_legacy' || file === 'uploads') return;
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
          results = results.concat(walk(fullPath));
        } else if (file.endsWith('.html') || file.endsWith('.js') || file.endsWith('.css')) {
          results.push(fullPath);
        }
      });
      return results;
    }

    const clientFiles = walk('client');
    let emojiCount = 0;
    for (const f of clientFiles) {
      const code = fs.readFileSync(f, 'utf8');
      if (emojiRegex.test(code)) {
        console.error('Found emoji in ' + f);
        emojiCount++;
      }
    }
    assert.strictEqual(emojiCount, 0, 'No emojis should exist in client files');
    console.log('  -> Verified 0 emojis in client.');

    console.log('\n====================================');
    console.log('ALL PHASE 15.2 TESTS PASSED SUCCESSFULLY!');
    console.log('====================================\n');

  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
    server.close();
  }
}

runTests();
