const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { app, startServer } = require('../server/index');
const { pool } = require('../server/config/db');

async function runTests() {
  const server = await startServer();
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Testing Phase 15.1 at ${baseUrl}...`);

  async function req(url, options = {}) {
    options.credentials = 'include';
    const res = await fetch(`${baseUrl}${url}`, options);
    const data = await res.json().catch(() => ({}));
    return { res, data, cookies: res.headers.get('set-cookie') };
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Authentication & Ticket Thread Chat System
    // ----------------------------------------------------
    console.log('[Test 1] Testing Ticket Thread Chat System...');

    // 1.1 Customer logs in
    const custLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
    });
    assert.strictEqual(custLogin.res.status, 200, 'Customer login failed');
    const custCookie = custLogin.cookies.split(';')[0];

    // 1.2 Customer creates a support ticket
    const createTicket = await req('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: custCookie },
      body: JSON.stringify({
        subject: 'Thread Test Ticket',
        message: 'Hello support team, I have a question about my booking.'
      })
    });
    assert.strictEqual(createTicket.res.status, 201, 'Create ticket failed');
    const ticketId = createTicket.data.ticket.id;
    assert.ok(ticketId, 'Ticket ID should be returned');

    // 1.3 Customer reads messages
    const custMsgs1 = await req(`/api/support/${ticketId}/messages`, {
      headers: { Cookie: custCookie }
    });
    assert.strictEqual(custMsgs1.res.status, 200, 'Fetch ticket messages failed');
    assert.ok(custMsgs1.data.messages.length >= 1, 'Initial message should exist');
    assert.strictEqual(custMsgs1.data.messages[0].message, 'Hello support team, I have a question about my booking.');

    // 1.4 Customer posts a follow-up message
    const custReply = await req(`/api/support/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: custCookie },
      body: JSON.stringify({ message: 'Also, can the technician arrive 15 minutes earlier?' })
    });
    assert.strictEqual(custReply.res.status, 201, 'Customer follow-up failed');
    assert.strictEqual(custReply.data.message.message, 'Also, can the technician arrive 15 minutes earlier?');

    // 1.5 Admin logs in
    const adminLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.test', password: 'demo1234' })
    });
    assert.strictEqual(adminLogin.res.status, 200, 'Admin login failed');
    const adminCookie = adminLogin.cookies.split(';')[0];

    // 1.6 Admin views messages
    const adminMsgs = await req(`/api/support/${ticketId}/messages`, {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(adminMsgs.res.status, 200, 'Admin fetch messages failed');
    assert.strictEqual(adminMsgs.data.messages.length, 2, 'Should have 2 messages so far');

    // 1.7 Admin replies to ticket
    const adminReply = await req(`/api/support/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ message: 'Hello! Yes, we have notified the specialist and they will arrive 15 minutes earlier.' })
    });
    assert.strictEqual(adminReply.res.status, 201, 'Admin reply failed');
    assert.strictEqual(adminReply.data.message.sender_role, 'admin');

    // 1.8 Verify all 3 messages in thread
    const finalMsgs = await req(`/api/support/${ticketId}/messages`, {
      headers: { Cookie: custCookie }
    });
    assert.strictEqual(finalMsgs.data.messages.length, 3, 'Thread should contain 3 messages');
    console.log('  -> Ticket thread chat passed with 3 messages verified.');

    // ----------------------------------------------------
    // TEST 2: Provider Media Uploads (Logo & Banner)
    // ----------------------------------------------------
    console.log('[Test 2] Testing Provider Media Uploads (Logo & Banner)...');

    // 2.1 Provider logs in
    const provLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'provider@demo.test', password: 'demo1234' })
    });
    assert.strictEqual(provLogin.res.status, 200, 'Provider login failed');
    const provCookie = provLogin.cookies.split(';')[0];

    // 2.2 Upload mock logo & banner using FormData
    const dummyLogo = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]); // Minimal PNG header
    const dummyBanner = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);

    const formData = new FormData();
    formData.append('logo', new Blob([dummyLogo], { type: 'image/png' }), 'test-logo.png');
    formData.append('banner', new Blob([dummyBanner], { type: 'image/png' }), 'test-banner.png');

    const uploadRes = await fetch(`${baseUrl}/api/provider/upload-media`, {
      method: 'POST',
      headers: { Cookie: provCookie },
      body: formData
    });
    const uploadData = await uploadRes.json();
    assert.strictEqual(uploadRes.status, 200, 'Media upload failed: ' + JSON.stringify(uploadData));
    assert.strictEqual(uploadData.ok, true);
    assert.ok(uploadData.logo_url.startsWith('/uploads/providers/'), 'Logo URL should point to uploads');
    assert.ok(uploadData.banner_url.startsWith('/uploads/providers/'), 'Banner URL should point to uploads');

    // 2.3 Verify uploads are served statically
    const staticLogo = await fetch(`${baseUrl}${uploadData.logo_url}`);
    assert.strictEqual(staticLogo.status, 200, 'Static logo serving failed');
    const staticBanner = await fetch(`${baseUrl}${uploadData.banner_url}`);
    assert.strictEqual(staticBanner.status, 200, 'Static banner serving failed');

    // 2.4 Verify Provider Search & Gig Details reflect uploaded media
    const provSearch = await req('/api/providers/search');
    assert.strictEqual(provSearch.res.status, 200);
    const updatedProv = provSearch.data.providers.find(p => p.logo_url === uploadData.logo_url);
    assert.ok(updatedProv, 'Provider search should include uploaded logo_url');
    assert.strictEqual(updatedProv.banner_url, uploadData.banner_url, 'Provider search should include uploaded banner_url');

    const gigRes = await req(`/api/gigs/${updatedProv.id}`);
    assert.strictEqual(gigRes.res.status, 200);
    assert.strictEqual(gigRes.data.provider.logo_url, uploadData.logo_url);
    assert.strictEqual(gigRes.data.provider.banner_url, uploadData.banner_url);
    console.log('  -> Provider media uploads verified and served statically.');

    // ----------------------------------------------------
    // TEST 3: CSS Underlines & Button Classes Check
    // ----------------------------------------------------
    console.log('[Test 3] Verifying CSS Rules & Button Utilities...');
    const cssContent = fs.readFileSync(path.join(__dirname, '..', 'client', 'css', 'style.css'), 'utf8');
    assert.ok(cssContent.includes('a { text-decoration: none; color: inherit; }'), 'Missing a text-decoration reset');
    assert.ok(cssContent.includes('.nav-item {'), 'Missing .nav-item rule');
    assert.ok(cssContent.includes('.nav-item:hover {'), 'Missing .nav-item:hover rule');
    assert.ok(cssContent.includes('.btn {'), 'Missing .btn utility');
    assert.ok(cssContent.includes('.btn-primary {'), 'Missing .btn-primary utility');
    assert.ok(cssContent.includes('.chat-container {'), 'Missing .chat-container style');
    assert.ok(cssContent.includes('.chat-msg.mine {'), 'Missing .chat-msg.mine style');
    assert.ok(cssContent.includes('.chat-msg.theirs {'), 'Missing .chat-msg.theirs style');
    console.log('  -> CSS rules verified.');

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
    console.log('ALL PHASE 15.1 TESTS PASSED SUCCESSFULLY!');
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
