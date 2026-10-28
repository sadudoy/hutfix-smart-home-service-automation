const assert = require('assert');
const { app, startServer } = require('../server/index');
const { pool } = require('../server/config/db');

async function runTests() {
  const server = await startServer();
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  console.log(`Testing Phase 14.1 at ${baseUrl}...`);

  async function req(url, options = {}) {
    options.credentials = 'include';
    const res = await fetch(`${baseUrl}${url}`, options);
    const data = await res.json().catch(() => ({}));
    return { res, data, cookies: res.headers.get('set-cookie') };
  }

  try {
    // 1. Login Customer
    const custLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@demo.test', password: 'demo1234' })
    });
    assert.strictEqual(custLogin.res.status, 200, 'Customer login should succeed');
    const custCookie = custLogin.cookies.split(';')[0];

    // 2. Test Support Tickets
    console.log('[Test 1] Support Ticket System...');
    const createTicket = await req('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: custCookie },
      body: JSON.stringify({ subject: 'AC servicing inquiry', message: 'Can you service outdoor AC units?' })
    });
    assert.strictEqual(createTicket.res.status, 201, 'Support ticket creation should return 201');
    assert.strictEqual(createTicket.data.ok, true);
    assert.strictEqual(createTicket.data.ticket.subject, 'AC servicing inquiry');
    const ticketId = createTicket.data.ticket.id;

    const myTickets = await req('/api/support/mine', {
      headers: { Cookie: custCookie }
    });
    assert.strictEqual(myTickets.res.status, 200);
    assert(myTickets.data.tickets.some(t => t.id === ticketId), 'Created ticket should appear in mine');

    // 3. Test Favorites Toggle & Mine
    console.log('[Test 2] Favorites System...');
    const favToggle1 = await req('/api/favorites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: custCookie },
      body: JSON.stringify({ provider_id: 1 })
    });
    assert.strictEqual(favToggle1.res.status, 200);
    assert.strictEqual(favToggle1.data.ok, true);
    const wasFavorited = favToggle1.data.favorited;

    const myFavs = await req('/api/favorites/mine', {
      headers: { Cookie: custCookie }
    });
    assert.strictEqual(myFavs.res.status, 200);
    assert(Array.isArray(myFavs.data.favorites), 'Favorites should be an array');
    if (wasFavorited) {
      assert(myFavs.data.favorite_provider_ids.includes(1), 'Provider 1 should be in favorite IDs');
    }

    // Toggle again to verify toggle off/on
    const favToggle2 = await req('/api/favorites/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: custCookie },
      body: JSON.stringify({ provider_id: 1 })
    });
    assert.strictEqual(favToggle2.data.favorited, !wasFavorited, 'Toggle should flip state');

    // 4. Test Admin Support Tickets & Payouts/Payments Data Enrichment
    console.log('[Test 3] Admin Support Tickets & Enriched Queries...');
    const adminLogin = await req('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@demo.test', password: 'demo1234' })
    });
    assert.strictEqual(adminLogin.res.status, 200, 'Admin login should succeed');
    const adminCookie = adminLogin.cookies.split(';')[0];

    // Admin view support tickets
    const adminTickets = await req('/api/admin/support', {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(adminTickets.res.status, 200);
    assert(adminTickets.data.tickets.some(t => t.id === ticketId), 'Admin should see ticket');

    // Admin resolve support ticket
    const resolveTicket = await req(`/api/admin/support/${ticketId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Cookie: adminCookie },
      body: JSON.stringify({ status: 'resolved' })
    });
    assert.strictEqual(resolveTicket.res.status, 200);
    assert.strictEqual(resolveTicket.data.ticket.status, 'resolved');

    // Admin Bookings enriched query
    const adminBookings = await req('/api/admin/bookings', {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(adminBookings.res.status, 200);
    assert(adminBookings.data.bookings.length > 0, 'Admin bookings should return list');
    const firstB = adminBookings.data.bookings[0];
    assert('category_name' in firstB && 'customer_name' in firstB, 'Enriched booking columns present');

    // Admin Payments enriched query
    const adminPayments = await req('/api/admin/payments', {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(adminPayments.res.status, 200);
    assert(Array.isArray(adminPayments.data.payments), 'Admin payments should return array');

    // Admin Payouts enriched query
    const adminPayouts = await req('/api/admin/payouts', {
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(adminPayouts.res.status, 200);
    assert(Array.isArray(adminPayouts.data.payouts), 'Admin payouts should return array');

    // 5. Test Provider Sign-Up Gate & Verification
    console.log('[Test 4] Provider Sign-Up Gate & Admin Verification...');
    const testEmail = `newpro_${Date.now()}@test.test`;
    const provRegister = await req('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Password123!',
        full_name: 'Test Pro Guy',
        phone: '+8801700000000',
        role: 'provider'
      })
    });
    assert.strictEqual(provRegister.res.status, 200, 'Registration should return 200');
    assert.strictEqual(provRegister.data.ok, true);
    const newUserId = provRegister.data.user.id;

    // Verify in db that is_active is false
    const provDbCheck = await pool.query('SELECT is_active FROM providers WHERE user_id = $1;', [newUserId]);
    assert.strictEqual(provDbCheck.rows[0].is_active, false, 'New provider must have is_active = false');

    // Admin checks users list
    const adminUsers = await req('/api/admin/users', {
      headers: { Cookie: adminCookie }
    });
    const foundUser = adminUsers.data.users.find(u => u.id === newUserId);
    assert(foundUser, 'Registered user must appear in admin users list');
    assert.strictEqual(foundUser.is_active, false, 'Admin users list shows provider is_active = false');

    // Admin verifies the provider
    const verifyUser = await req(`/api/admin/users/${newUserId}/verify`, {
      method: 'PATCH',
      headers: { Cookie: adminCookie }
    });
    assert.strictEqual(verifyUser.res.status, 200);
    assert.strictEqual(verifyUser.data.is_active, true, 'Provider is_active should now be true');

    // Verify in db that is_active is now true
    const provDbCheckAfter = await pool.query('SELECT is_active FROM providers WHERE user_id = $1;', [newUserId]);
    assert.strictEqual(provDbCheckAfter.rows[0].is_active, true, 'Provider should now be active in db');

    console.log('\n====================================');
    console.log('ALL PHASE 14.1 TESTS PASSED SUCCESSFULLY!');
    console.log('====================================\n');
  } finally {
    server.close();
    await pool.end();
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
