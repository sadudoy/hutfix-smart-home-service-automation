const assert = require('assert');
const { app, startServer } = require('../server/index');
const { pool } = require('../server/config/db');

async function runTests() {
  const server = await startServer();
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Testing Phase 15.4 at ${baseUrl}...`);

  async function req(url, options = {}, cookie = '') {
    const headers = { ...(options.headers || {}) };
    if (cookie) headers['cookie'] = cookie;
    const res = await fetch(`${baseUrl}${url}`, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    const setCookie = res.headers.get('set-cookie');
    return { res, data, setCookie: setCookie ? setCookie.split(';')[0] : cookie };
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Clean Seed Users Verification
    // ----------------------------------------------------
    console.log('[Test 1] Verifying Clean Seed Users (Only 3 Users)...');
    const uRes = await pool.query('SELECT id, email, full_name, role FROM users ORDER BY id;');
    assert.strictEqual(uRes.rows.length, 3, `Expected exactly 3 users in DB, found ${uRes.rows.length}`);
    const emails = uRes.rows.map(u => u.email).sort();
    assert.deepStrictEqual(emails, ['admin@demo.test', 'customer@demo.test', 'provider@demo.test']);
    console.log('  -> Confirmed 3 users: customer@demo.test, provider@demo.test, admin@demo.test');

    // ----------------------------------------------------
    // TEST 2: Old Password Verification (Backend)
    // ----------------------------------------------------
    console.log('[Test 2] Testing Old Password Verification...');
    // 2.1 Login Customer
    const custLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
    });
    assert.strictEqual(custLogin.res.status, 200, 'Customer login failed');
    const custCookie = custLogin.setCookie;

    // 2.2 Attempt password update with WRONG old password -> must fail with 401
    const wrongPassRes = await req('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'newpass1234', old_password: 'wrongpassword' })
    }, custCookie);
    assert.strictEqual(wrongPassRes.res.status, 401, 'Expected 401 for wrong old password');
    assert.strictEqual(wrongPassRes.data.error, 'Incorrect current password');
    console.log('  -> Wrong old password correctly rejected with 401.');

    // 2.3 Attempt password update with missing old password -> must fail with 401
    const noOldPassRes = await req('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'newpass1234' })
    }, custCookie);
    assert.strictEqual(noOldPassRes.res.status, 401, 'Expected 401 for missing old password');
    console.log('  -> Missing old password correctly rejected with 401.');

    // 2.4 Update password with CORRECT old password -> must succeed with 200
    const correctPassRes = await req('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'newpass1234', old_password: 'demo1234' })
    }, custCookie);
    assert.strictEqual(correctPassRes.res.status, 200, 'Password update with correct old password failed');
    console.log('  -> Password successfully updated with correct old password.');

    // Revert password back to demo1234
    await req('/api/auth/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'demo1234', old_password: 'newpass1234' })
    }, custCookie);
    console.log('  -> Password restored to demo1234.');

    // ----------------------------------------------------
    // TEST 3: Admin Platform Settings & User Details
    // ----------------------------------------------------
    console.log('[Test 3] Testing Admin Platform Settings & User Details...');
    // 3.1 Login Admin
    const adminLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.test', password: 'demo1234' })
    });
    assert.strictEqual(adminLogin.res.status, 200, 'Admin login failed');
    const adminCookie = adminLogin.setCookie;

    // 3.2 Public GET /api/settings
    const publicSettings = await req('/api/settings');
    assert.strictEqual(publicSettings.res.status, 200);
    assert.ok(publicSettings.data.settings.bkash_number, 'Missing bkash_number in settings');
    console.log('  -> Public /api/settings returned:', publicSettings.data.settings);

    // 3.3 Admin updates bkash_number to 01799887766
    const updateSettingsRes = await req('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bkash_number: '01799887766', nagad_number: '01899887766' })
    }, adminCookie);
    assert.strictEqual(updateSettingsRes.res.status, 200);
    assert.strictEqual(updateSettingsRes.data.settings.bkash_number, '01799887766');

    // Verify public /api/settings reflects update
    const publicSettings2 = await req('/api/settings');
    assert.strictEqual(publicSettings2.data.settings.bkash_number, '01799887766');
    console.log('  -> Admin updated bkash_number to 01799887766, verified on public endpoint.');

    // Restore to default
    await req('/api/admin/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bkash_number: '01700000000', nagad_number: '01700000000' })
    }, adminCookie);

    // 3.4 Admin GET /api/admin/users/:id
    const userDetailRes = await req(`/api/admin/users/${uRes.rows.find(u => u.email === 'customer@demo.test').id}`, {}, adminCookie);
    assert.strictEqual(userDetailRes.res.status, 200);
    assert.strictEqual(userDetailRes.data.user.email, 'customer@demo.test');
    assert.ok(userDetailRes.data.user.address, 'Expected customer address in details');
    console.log('  -> Admin user details fetched successfully (Customer address:', userDetailRes.data.user.address, ')');

    const provUserDetailRes = await req(`/api/admin/users/${uRes.rows.find(u => u.email === 'provider@demo.test').id}`, {}, adminCookie);
    assert.strictEqual(provUserDetailRes.res.status, 200);
    assert.strictEqual(provUserDetailRes.data.user.email, 'provider@demo.test');
    assert.ok(provUserDetailRes.data.user.nid_number, 'Expected provider NID');
    console.log('  -> Admin provider details fetched successfully (NID:', provUserDetailRes.data.user.nid_number, ')');

    // ----------------------------------------------------
    // TEST 4: Provider Gigs & Availability
    // ----------------------------------------------------
    console.log('[Test 4] Testing Provider Gigs (Edit/Delete) & Availability...');
    const provLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'provider@demo.test', password: 'demo1234' })
    });
    assert.strictEqual(provLogin.res.status, 200);
    const provCookie = provLogin.setCookie;

    // 4.1 GET /api/provider/services
    const gigsRes = await req('/api/provider/services', {}, provCookie);
    assert.strictEqual(gigsRes.res.status, 200);
    assert.ok(Array.isArray(gigsRes.data.services) && gigsRes.data.services.length > 0);
    const testGig = gigsRes.data.services[0];
    console.log(`  -> Provider has ${gigsRes.data.services.length} gigs. Editing gig #${testGig.id}...`);

    // 4.2 PATCH /api/provider/services/:id
    const editGigRes = await req(`/api/provider/services/${testGig.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 1100.00 })
    }, provCookie);
    assert.strictEqual(editGigRes.res.status, 200);
    assert.strictEqual(Number(editGigRes.data.service.price), 1100);
    console.log('  -> Provider gig price updated to ৳1100.');

    // 4.3 PUT /api/provider/availability
    const availRes = await req('/api/provider/availability', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        availability: [
          { weekday: 1, start_minute: 540, end_minute: 1080 },
          { weekday: 2, start_minute: 540, end_minute: 1080 },
          { weekday: 3, start_minute: 540, end_minute: 1080 },
          { weekday: 4, start_minute: 540, end_minute: 1080 },
          { weekday: 5, start_minute: 540, end_minute: 1080 },
          { weekday: 6, start_minute: 600, end_minute: 1200 }
        ]
      })
    }, provCookie);
    assert.strictEqual(availRes.res.status, 200);
    console.log('  -> Provider weekly working hours saved successfully.');

    // ----------------------------------------------------
    // TEST 5: Rating Submission Bug Fix (Integer Stars & Strings)
    // ----------------------------------------------------
    console.log('[Test 5] Testing Rating Submission Bug Fix...');
    // Find a completed request for customer 1
    const reqRes = await pool.query("SELECT id FROM service_requests WHERE status = 'completed' AND customer_id = $1 LIMIT 1;", [uRes.rows.find(u => u.email === 'customer@demo.test').id]);
    assert.ok(reqRes.rows.length > 0, 'No completed request found to rate');
    const reqId = reqRes.rows[0].id;

    // Delete existing rating on this request if any so we can submit cleanly
    await pool.query('DELETE FROM ratings WHERE request_id = $1;', [reqId]);

    // Send rating using frontend format { rating_stars: 5, review_comment: 'Superb work' }
    const rateRes = await req(`/api/ratings/by-request/${reqId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating_stars: '5', review_comment: 'Superb work' })
    }, custCookie);
    assert.strictEqual(rateRes.res.status, 200, `Rating submission failed: ${JSON.stringify(rateRes.data)}`);
    assert.ok(rateRes.data.ok, 'Rating was not marked ok');
    console.log('  -> Rating submitted successfully with string number "5" and rating_stars parameter!');

    // ----------------------------------------------------
    // TEST 6: Notifications & Routing
    // ----------------------------------------------------
    console.log('[Test 6] Testing Notifications with links...');
    const notifs = await req('/api/notifications', {}, custCookie);
    assert.strictEqual(notifs.res.status, 200);
    console.log(`  -> Customer has ${notifs.data.notifications.length} notifications.`);

    console.log('\n==========================================');
    console.log('ALL PHASE 15.4 AUTOMATED TESTS PASSED!');
    console.log('==========================================');

  } catch (err) {
    console.error('TEST SUITE FAILED:', err);
    process.exit(1);
  } finally {
    server.close();
    process.exit(0);
  }
}

runTests();
