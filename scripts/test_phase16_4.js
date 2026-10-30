/**
 * Test Phase 16.4 — Core Edge Cases Automated Verification
 */

const assert = require('assert');
const { pool } = require('../server/config/db');

const BASE_URL = 'http://localhost:3011';

async function run() {
  console.log('Starting Phase 16.4 Automated Test Suite...');

  // Start temporary test server
  const express = require('express');
  const cookieParser = require('cookie-parser');
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  app.use('/api/auth', require('../server/routes/auth.routes'));
  app.use('/api/providers', require('../server/routes/providers.routes'));
  app.use('/api/provider', require('../server/routes/provider-ops.routes'));
  app.use('/api/requests', require('../server/routes/requests.routes'));

  const server = app.listen(3011);

  try {
    // -----------------------------------------------------------------
    // 1. FORGOT PASSWORD & RESET PASSWORD
    // -----------------------------------------------------------------
    console.log('\n[1] Testing Forgot Password & Reset Password...');

    // 1.1 Non-existent user
    const res1 = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nonexistent_test_123@domain.com' })
    });
    assert.strictEqual(res1.status, 404, 'Non-existent email should return 404');
    console.log('  -> 404 on non-existent email confirmed.');

    // 1.2 Valid user forgot-password
    const res2 = await fetch(`${BASE_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@demo.test' })
    });
    const data2 = await res2.json();
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(data2.ok, true, 'Forgot password response must be ok: true');

    const userRow = await pool.query('SELECT reset_token, reset_token_expiry FROM users WHERE email = $1;', ['customer@demo.test']);
    const token = userRow.rows[0].reset_token;
    assert(token && token.length > 20, 'Token generated and stored in users table');
    console.log('  -> Reset token generated in DB:', token);

    // 1.3 Reset password with token
    const res3 = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: 'demo1234_new' })
    });
    const data3 = await res3.json();
    assert.strictEqual(res3.status, 200);
    assert.strictEqual(data3.ok, true, 'Reset password response must be ok: true');

    // 1.4 Token is now cleared
    const userRowAfter = await pool.query('SELECT reset_token, reset_token_expiry FROM users WHERE email = $1;', ['customer@demo.test']);
    assert.strictEqual(userRowAfter.rows[0].reset_token, null, 'Reset token cleared after usage');

    // 1.5 Reuse token should fail
    const res4 = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password: 'demo1234_another' })
    });
    assert.strictEqual(res4.status, 400, 'Reusing cleared token must fail with 400');

    // 1.6 Verify login with new password
    const resLoginNew = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234_new' })
    });
    assert.strictEqual(resLoginNew.status, 200, 'Customer logged in with newly reset password');

    // Restore original demo password
    const resResetOriginal = await pool.query(
      "UPDATE users SET password_hash = crypt('demo1234', gen_salt('bf')) WHERE email = 'customer@demo.test';"
    );
    console.log('  -> Customer password restored to demo1234.');

    // -----------------------------------------------------------------
    // 2. HOMEPAGE SEARCH
    // -----------------------------------------------------------------
    console.log('\n[2] Testing Provider / Gig Search Endpoint with ?q=...');

    const resSearch1 = await fetch(`${BASE_URL}/api/providers/search?q=plumbing`);
    const dataSearch1 = await resSearch1.json();
    assert.strictEqual(resSearch1.status, 200);
    assert(Array.isArray(dataSearch1.providers), 'providers array returned');
    console.log(`  -> Search for "plumbing" returned ${dataSearch1.providers.length} provider gigs.`);

    const resSearchEmpty = await fetch(`${BASE_URL}/api/providers/search?q=xyznonexistentterm999`);
    const dataSearchEmpty = await resSearchEmpty.json();
    assert.strictEqual(resSearchEmpty.status, 200);
    assert.strictEqual(dataSearchEmpty.providers.length, 0, 'No results returns empty array');
    console.log('  -> Search with non-existent query returned 0 results.');

    // -----------------------------------------------------------------
    // 3. PREVENT DELETING GIGS WITH ACTIVE BOOKINGS
    // -----------------------------------------------------------------
    console.log('\n[3] Testing Gig Deletion Safety with Active Bookings...');

    // Login as provider
    const provLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'provider@demo.test', password: 'demo1234' })
    });
    const provCookie = provLoginRes.headers.get('set-cookie');

    // Get provider's gigs
    const provGigsRes = await fetch(`${BASE_URL}/api/provider/services`, {
      headers: { cookie: provCookie }
    });
    const provGigsData = await provGigsRes.json();
    const gigs = provGigsData.services || [];
    assert(gigs.length > 0, 'Provider has services');
    const gigToTest = gigs[0];

    // Insert a dummy active booking matching provider and category
    const provIdRes = await pool.query('SELECT p.id FROM providers p JOIN users u ON u.id = p.user_id WHERE u.email = $1;', ['provider@demo.test']);
    const providerId = provIdRes.rows[0].id;
    const customerRes = await pool.query("SELECT id FROM users WHERE email = 'customer@demo.test';");
    const customerId = customerRes.rows[0].id;

    const dummyBookingRes = await pool.query(`
      INSERT INTO service_requests (
        customer_id, category_id, assigned_provider_id, address,
        preferred_date, preferred_start_minute, preferred_end_minute, status
      ) VALUES (
        $1, $2, $3, 'Test Address', '2026-11-15', 600, 660, 'in_progress'
      ) RETURNING id;
    `, [customerId, gigToTest.category_id, providerId]);
    const dummyReqId = dummyBookingRes.rows[0].id;

    // Attempt to delete gig -> MUST FAIL WITH 400
    const delResFail = await fetch(`${BASE_URL}/api/provider/services/${gigToTest.id}`, {
      method: 'DELETE',
      headers: { cookie: provCookie }
    });
    const delDataFail = await delResFail.json();
    assert.strictEqual(delResFail.status, 400, 'DELETE gig with active booking must return 400');
    assert.strictEqual(delDataFail.error, 'Cannot delete a gig with active bookings. Please complete or cancel them first.');
    console.log('  -> Confirmed 400 error when deleting gig with active booking:', delDataFail.error);

    // Clean up dummy active booking
    await pool.query('DELETE FROM service_requests WHERE id = $1;', [dummyReqId]);
    console.log('  -> Cleaned up active test booking.');

    // -----------------------------------------------------------------
    // 4. PREVENT PAST DATE BOOKINGS
    // -----------------------------------------------------------------
    console.log('\n[4] Testing Past Date Booking Prevention...');

    // Login customer
    const custLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
    });
    const custCookie = custLoginRes.headers.get('set-cookie');

    // 4.1 POST /api/requests/match with past date
    const resMatchPast = await fetch(`${BASE_URL}/api/requests/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: custCookie },
      body: JSON.stringify({
        category_slug: 'appliance-repair',
        preferred_date: '2025-01-01',
        preferred_start_minute: 600,
        preferred_end_minute: 660,
        address: 'Dhaka'
      })
    });
    const dataMatchPast = await resMatchPast.json();
    assert.strictEqual(resMatchPast.status, 400, 'match with past date must return 400');
    assert.strictEqual(dataMatchPast.error, 'Cannot book a date in the past.');
    console.log('  -> Match with past date rejected with 400:', dataMatchPast.error);

    // 4.2 POST /api/requests with past date
    const resReqPast = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: custCookie },
      body: JSON.stringify({
        category_slug: 'appliance-repair',
        provider_id: providerId,
        preferred_date: '2025-01-01',
        preferred_start_minute: 600,
        preferred_end_minute: 660,
        address: 'Dhaka'
      })
    });
    const dataReqPast = await resReqPast.json();
    assert.strictEqual(resReqPast.status, 400, 'create booking with past date must return 400');
    assert.strictEqual(dataReqPast.error, 'Cannot book a date in the past.');
    console.log('  -> Create booking with past date rejected with 400:', dataReqPast.error);

    // 4.3 POST /api/requests with future date succeeds
    const resReqFuture = await fetch(`${BASE_URL}/api/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: custCookie },
      body: JSON.stringify({
        category_slug: 'appliance-repair',
        provider_id: providerId,
        preferred_date: '2026-11-20',
        preferred_start_minute: 600,
        preferred_end_minute: 660,
        address: 'Banani, Dhaka',
        payment_method: 'bkash',
        trx_id: 'TRX_TEST_' + Date.now(),
        sender_number: '01700000000'
      })
    });
    const dataReqFuture = await resReqFuture.json();
    assert.strictEqual(resReqFuture.status, 200, 'create booking with future date succeeds');
    assert.strictEqual(dataReqFuture.ok, true);
    console.log('  -> Create booking with future date confirmed (Request #' + dataReqFuture.request.id + ').');

    // Clean up future test request
    await pool.query('DELETE FROM service_requests WHERE id = $1;', [dataReqFuture.request.id]);

    console.log('\n==========================================');
    console.log('ALL PHASE 16.4 AUTOMATED TESTS PASSED!');
    console.log('==========================================');
  } finally {
    server.close();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('\nTest failed with error:', err);
  process.exit(1);
});
