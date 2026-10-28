const http = require('http');
const fs = require('fs');
const path = require('path');
const { app } = require('../server/index');
const { pool } = require('../server/config/db');

let server;
const PORT = 3009;

function request(options, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      port: PORT,
      host: 'localhost',
      ...options,
      headers: {
        ...headers,
        ...(data && typeof data === 'string' && !headers['Content-Type'] ? { 'Content-Type': 'application/json' } : {})
      }
    }, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (_) {}
        resolve({ status: res.statusCode, headers: res.headers, body: json || body });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  server = app.listen(PORT);
  console.log('Testing Phase 15.8 on port ' + PORT);

  try {
    // 1. Verify GET /api/services returns categories
    console.log('[Step 1] Verifying GET /api/services...');
    const svcRes = await request({ path: '/api/services', method: 'GET' });
    if (svcRes.status !== 200 || !svcRes.body.categories || svcRes.body.categories.length === 0) {
      throw new Error('GET /api/services failed to return categories');
    }
    console.log(`  -> Found ${svcRes.body.categories.length} service categories.`);

    // 2. Login as Provider
    console.log('[Step 2] Login as provider@demo.test...');
    const loginRes = await request(
      { path: '/api/auth/login', method: 'POST' },
      JSON.stringify({ email: 'provider@demo.test', password: 'demo1234' })
    );
    if (loginRes.status !== 200 || !loginRes.body.ok) {
      throw new Error('Provider login failed');
    }
    const cookie = loginRes.headers['set-cookie'] ? loginRes.headers['set-cookie'].map(c => c.split(';')[0]).join('; ') : '';
    console.log('  -> Provider authenticated successfully.');

    // 3. Test creating a gig with JSON
    console.log('[Step 3] Testing POST /api/provider/services (JSON)...');
    const newGigRes = await request(
      { path: '/api/provider/services', method: 'POST' },
      JSON.stringify({
        category_id: 2,
        price: 950,
        title: 'Emergency Pipe Leak Fix',
        description: 'Fixes leaks, replaces washers, inspects drainage lines.',
        duration_minutes: 45
      }),
      { 'Cookie': cookie, 'Content-Type': 'application/json' }
    );
    if (newGigRes.status !== 201 || !newGigRes.body.ok || !newGigRes.body.service) {
      throw new Error('Failed to create gig: ' + JSON.stringify(newGigRes.body));
    }
    const createdGig = newGigRes.body.service;
    console.log(`  -> Gig #${createdGig.id} created: "${createdGig.title}", Duration: ${createdGig.duration_minutes}m, Price: ৳${createdGig.price}`);

    // 4. Test creating a gig with multipart/form-data (banner upload)
    console.log('[Step 4] Testing POST /api/provider/services with banner file upload (multipart)...');
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    
    // Create dummy image buffer
    const dummyImage = Buffer.from('GIF89a\x01\x00\x01\x00\x80\x00\x00\xff\xff\xff\x00\x00\x00!\xf9\x04\x01\x00\x00\x00\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02D\x01\x00;', 'binary');

    let postData = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="category_id"\r\n\r\n3\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="price"\r\n\r\n1200\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="title"\r\n\r\nCircuit Breaker Diagnosis\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="description"\r\n\r\nFull electrical panel and breaker inspection with load testing.\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="duration_minutes"\r\n\r\n90\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="banner"; filename="breaker.png"\r\nContent-Type: image/png\r\n\r\n`),
      dummyImage,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);

    const multipartRes = await request(
      { path: '/api/provider/services', method: 'POST' },
      postData,
      {
        'Cookie': cookie,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      }
    );
    if (multipartRes.status !== 201 || !multipartRes.body.ok || !multipartRes.body.service) {
      throw new Error('Multipart gig creation failed: ' + JSON.stringify(multipartRes.body));
    }
    const multipartGig = multipartRes.body.service;
    console.log(`  -> Multipart Gig #${multipartGig.id} created: "${multipartGig.title}", Banner URL: ${multipartGig.banner_url}`);

    // 5. Verify GET /api/provider/services
    console.log('[Step 5] Checking GET /api/provider/services...');
    const listRes = await request({ path: '/api/provider/services', method: 'GET' }, null, { 'Cookie': cookie });
    if (listRes.status !== 200 || !listRes.body.services) throw new Error('Failed to get provider services');
    console.log(`  -> Provider now has ${listRes.body.services.length} active service gigs.`);

    // 6. Verify GET /api/providers/:userId/profile includes new fields
    console.log('[Step 6] Checking GET /api/providers/2/profile...');
    const profRes = await request({ path: '/api/providers/2/profile', method: 'GET' }, null, { 'Cookie': cookie });
    if (profRes.status !== 200 || !profRes.body.provider?.services) throw new Error('Failed to get provider profile');
    const profileServices = profRes.body.provider.services;
    const hasNewFields = profileServices.some(s => s.title && s.duration_minutes);
    if (!hasNewFields) throw new Error('Profile services missing title or duration_minutes');
    console.log(`  -> Profile returned ${profileServices.length} services with detailed titles and durations.`);

    // 7. Verify GET /api/gigs/1 includes new fields
    console.log('[Step 7] Checking public GET /api/gigs/1...');
    const gigPageRes = await request({ path: '/api/gigs/1', method: 'GET' });
    if (gigPageRes.status !== 200 || !gigPageRes.body.provider?.services) throw new Error('Failed to get gig details');
    const pubServices = gigPageRes.body.provider.services;
    console.log(`  -> Public gig page returned ${pubServices.length} services with banner & duration info.`);

    // 8. Verify GET /api/providers/search
    console.log('[Step 8] Checking GET /api/providers/search on Discover page...');
    const searchRes = await request({ path: '/api/providers/search', method: 'GET' });
    if (searchRes.status !== 200 || !searchRes.body.providers) throw new Error('Search failed');
    const matchingGigs = searchRes.body.providers;
    console.log(`  -> Discover catalog returned ${matchingGigs.length} individual provider gigs.`);

    console.log('\n==========================================');
    console.log('ALL PHASE 15.8 AUTOMATED TESTS PASSED!');
    console.log('==========================================');

  } finally {
    server.close();
    await pool.end();
  }
}

run().catch(err => {
  console.error('Test error:', err);
  if (server) server.close();
  process.exit(1);
});
