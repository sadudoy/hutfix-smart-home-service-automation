const path = require('path');
const { app } = require('../server/index');
const { pool } = require('../server/config/db');

async function runSmokeTest() {
  console.log('====================================================');
  console.log('           HUTFIX E2E SMOKE TEST                    ');
  console.log('====================================================');

  const server = app.listen(0);
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  try {
    async function apiRequest(endpoint, { method = 'GET', body = null, cookie = '' } = {}) {
      const headers = {};
      if (body) headers['Content-Type'] = 'application/json';
      if (cookie) headers['Cookie'] = cookie;

      const res = await fetch(`${baseUrl}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : null
      });

      const cookieHeader = res.headers.get('set-cookie');
      let tokenCookie = '';
      if (cookieHeader) {
        const match = cookieHeader.match(/hutfix_token=[^;]+/);
        if (match) tokenCookie = match[0];
      }

      const data = await res.json().catch(() => ({}));
      return { status: res.status, data, tokenCookie };
    }

    // Step 1: Login Customer
    console.log('[Step 1] Login Customer (customer@demo.test)...');
    const custLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'customer@demo.test', password: 'demo1234' }
    });
    if (custLogin.status !== 200 || !custLogin.tokenCookie) {
      throw new Error(`Customer login failed with status ${custLogin.status}: ${JSON.stringify(custLogin.data)}`);
    }
    const customerCookie = custLogin.tokenCookie;
    console.log('  -> Customer authenticated successfully.');

    // Step 2: Book manual payment
    console.log('[Step 2] Book service with bKash manual payment proof...');
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 3);
    const dateStr = targetDate.toISOString().split('T')[0];

    const slotsRes = await apiRequest(`/api/providers/1/slots?date=${dateStr}&category_slug=appliance-repair`);
    const availableSlots = (slotsRes.data?.slots || []).filter(s => s.available);
    if (availableSlots.length === 0) {
      throw new Error(`No available slots for provider 1 on ${dateStr}`);
    }
    const chosenSlot = availableSlots[0];
    const trxId = 'TRX' + Date.now();

    const bookRes = await apiRequest('/api/requests', {
      method: 'POST',
      cookie: customerCookie,
      body: {
        category_slug: 'appliance-repair',
        provider_id: 1,
        preferred_date: dateStr,
        preferred_start_minute: chosenSlot.start_minute,
        preferred_end_minute: chosenSlot.end_minute,
        urgency: 'normal',
        address: 'House 18, Road 7, Dhanmondi, Dhaka',
        phone: '+880 1712-345678',
        description: 'Smoke test AC diagnostic and repair',
        payment_method: 'bkash',
        trx_id: trxId,
        sender_number: '01712345678'
      }
    });

    if (![200, 201].includes(bookRes.status) || !bookRes.data.ok) {
      throw new Error(`Booking failed: ${JSON.stringify(bookRes.data)}`);
    }
    const requestId = bookRes.data.request?.id || bookRes.data.requestId;
    if (!requestId) throw new Error('No requestId returned from booking creation');
    console.log(`  -> Booking created successfully: Request #${requestId} (status: requested, payment_status: pending).`);

    // Step 3: Login Admin
    console.log('[Step 3] Login Admin (admin@demo.test)...');
    const adminLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'admin@demo.test', password: 'demo1234' }
    });
    if (adminLogin.status !== 200 || !adminLogin.tokenCookie) {
      throw new Error(`Admin login failed: ${JSON.stringify(adminLogin.data)}`);
    }
    const adminCookie = adminLogin.tokenCookie;
    console.log('  -> Admin authenticated successfully.');

    // Step 4: Verify Payment
    console.log(`[Step 4] Admin verifying payment for Request #${requestId}...`);
    const verifyRes = await apiRequest(`/api/admin/payments/${requestId}/verify`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { action: 'verify' }
    });
    if (verifyRes.status !== 200 || !verifyRes.data.ok) {
      throw new Error(`Payment verification failed: ${JSON.stringify(verifyRes.data)}`);
    }
    console.log(`  -> Payment verified by Admin (TrxID: ${trxId}, payment_status: verified).`);

    // Step 5: Login Provider
    console.log('[Step 5] Login Provider (provider@demo.test)...');
    const provLogin = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: { email: 'provider@demo.test', password: 'demo1234' }
    });
    if (provLogin.status !== 200 || !provLogin.tokenCookie) {
      throw new Error(`Provider login failed: ${JSON.stringify(provLogin.data)}`);
    }
    const providerCookie = provLogin.tokenCookie;
    console.log('  -> Provider authenticated successfully.');

    // Step 6: Accept & Complete
    console.log(`[Step 6] Provider accepting Request #${requestId}...`);
    const acceptRes = await apiRequest(`/api/requests/${requestId}/accept`, {
      method: 'POST',
      cookie: providerCookie
    });
    if (acceptRes.status !== 200 || !acceptRes.data.ok) {
      throw new Error(`Provider accept failed: ${JSON.stringify(acceptRes.data)}`);
    }

    console.log(`  -> Provider moving status to on_the_way...`);
    const otwRes = await apiRequest(`/api/requests/${requestId}/status`, {
      method: 'PATCH',
      cookie: providerCookie,
      body: { status: 'on_the_way' }
    });
    if (otwRes.status !== 200 || !otwRes.data.ok) {
      throw new Error(`Provider on_the_way failed: ${JSON.stringify(otwRes.data)}`);
    }

    console.log(`  -> Provider moving status to in_progress...`);
    const progressRes = await apiRequest(`/api/requests/${requestId}/status`, {
      method: 'PATCH',
      cookie: providerCookie,
      body: { status: 'in_progress' }
    });
    if (progressRes.status !== 200 || !progressRes.data.ok) {
      throw new Error(`Provider in_progress failed: ${JSON.stringify(progressRes.data)}`);
    }

    console.log(`  -> Provider completing Request #${requestId}...`);
    const completeRes = await apiRequest(`/api/requests/${requestId}/status`, {
      method: 'PATCH',
      cookie: providerCookie,
      body: { status: 'completed' }
    });
    if (completeRes.status !== 200 || !completeRes.data.ok) {
      throw new Error(`Provider complete failed: ${JSON.stringify(completeRes.data)}`);
    }
    console.log(`  -> Request #${requestId} marked as completed.`);

    // Step 7: Login Customer
    console.log('[Step 7] Checking Customer session...');
    const custVerify = await apiRequest('/api/auth/me', {
      cookie: customerCookie
    });
    if (custVerify.status !== 200) {
      throw new Error('Customer session verification failed');
    }
    console.log('  -> Customer session verified.');

    // Step 8: Check Invoice
    console.log(`[Step 8] Checking generated Invoice for Request #${requestId}...`);
    const invRes = await apiRequest(`/api/invoices/by-request/${requestId}`, {
      cookie: customerCookie
    });
    if (invRes.status !== 200 || !invRes.data.ok || !invRes.data.invoice) {
      throw new Error(`Invoice check failed: ${JSON.stringify(invRes.data)}`);
    }
    const inv = invRes.data.invoice;
    console.log(`  -> Invoice #${inv.id} confirmed: Total ৳${inv.total} ${inv.currency}, issued for ${inv.customer_name}.`);

    console.log('\n====================================');
    console.log('E2E SMOKE TEST PASSED');
    console.log('====================================\n');
  } finally {
    server.close();
  }
}

if (require.main === module) {
  runSmokeTest()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('\n❌ E2E SMOKE TEST FAILED:', err.message);
      process.exit(1);
    });
}

module.exports = { runSmokeTest };
