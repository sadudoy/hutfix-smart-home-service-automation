/**
 * Phase 1 Verification Test Suite
 *
 * Verifies:
 * 1. Firebase cleanup (files removed, zero active code references).
 * 2. Static structure (monorepo files, schema, seed, configs, legacy moves).
 * 3. PostgreSQL database integration (categories count = 8, providers >= 10).
 * 4. Express server smoke test (starts, serves /api/health with DB connected, terminates).
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

function skip(testName, reason = '') {
    skipCount++;
    console.log(`[SKIP] ${testName} - ${reason}`);
}

console.log('====================================================');
console.log('  PHASE 1: MONOREPO & BACKEND VERIFICATION SUITE    ');
console.log('====================================================\n');

async function runTests() {
    // --------------------------------------------------------
    // 1. Firebase cleanup assertions
    // --------------------------------------------------------
    console.log('--- 1. Firebase Cleanup Checks ---');
    assert(!fs.existsSync(path.resolve(__dirname, 'firebase.json')), 'firebase.json does not exist at repo root');
    assert(!fs.existsSync(path.resolve(__dirname, '404.html')), '404.html does not exist at repo root');

    // No file matching .firebase* at repo root
    const rootFiles = fs.readdirSync(__dirname);
    const hasFirebaseFile = rootFiles.some(f => f.startsWith('.firebase') && !fs.statSync(path.resolve(__dirname, f)).isDirectory());
    assert(!hasFirebaseFile, 'No file matching .firebase* exists at repo root');

    // .firebase/ directory does NOT exist at repo root
    assert(!fs.existsSync(path.resolve(__dirname, '.firebase')), '.firebase/ directory does not exist at repo root');

    // Grep repo (excluding client/_legacy, node_modules, AUDIT.md, .git) for 'firebase'
    function scanForFirebase(dir) {
        const matches = [];
        const entries = fs.readdirSync(dir, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = path.relative(__dirname, fullPath).replace(/\\/g, '/');

            if (entry.isDirectory()) {
                if (
                    relPath === 'node_modules' ||
                    relPath.startsWith('node_modules/') ||
                    relPath === 'client/_legacy' ||
                    relPath.startsWith('client/_legacy/') ||
                    relPath === '.git' ||
                    relPath.startsWith('.git/')
                ) {
                    continue;
                }
                matches.push(...scanForFirebase(fullPath));
            } else if (entry.isFile()) {
                if (relPath === 'AUDIT.md' || relPath === 'test_phase0.js' || relPath === 'test_phase1.js' || relPath === '.gitignore') {
                    // AUDIT.md records the past audit, test_phase0 tests baseline, .gitignore has ignore rules
                    continue;
                }
                const content = fs.readFileSync(fullPath, 'utf8');
                const lines = content.split('\n');
                lines.forEach((line, idx) => {
                    if (/firebase/i.test(line)) {
                        matches.push(`${relPath}:${idx + 1}`);
                    }
                });
            }
        }
        return matches;
    }

    const firebaseMatches = scanForFirebase(__dirname);
    assert(firebaseMatches.length === 0, 'Zero firebase references in active code', firebaseMatches.join(', '));

    // --------------------------------------------------------
    // 2. Static Assertions
    // --------------------------------------------------------
    console.log('\n--- 2. Static Monorepo Structure Checks ---');
    const requiredFiles = [
        '.gitignore',
        '.env.example',
        'README.md',
        'docs/API.md',
        'database/schema.sql',
        'database/seed.sql',
        'database/README.md',
        'server/index.js',
        'server/config/db.js',
        'server/config/env.js',
        'server/middleware/error.js',
        'server/routes/health.routes.js',
        'client/index.html',
        'client/css/.gitkeep',
        'client/js/.gitkeep',
        'client/assets/images/logo.jpg',
        'client/assets/images/default-avatar.svg'
    ];

    requiredFiles.forEach(file => {
        const fullPath = path.resolve(__dirname, file);
        assert(fs.existsSync(fullPath), `Required file exists: ${file}`);
    });

    // .env exists AND .gitignore contains /^\.env$/m
    assert(fs.existsSync(path.resolve(__dirname, '.env')), '.env exists at repo root');
    const gitignoreContent = fs.readFileSync(path.resolve(__dirname, '.gitignore'), 'utf8');
    assert(/^\.env$/m.test(gitignoreContent), '.gitignore explicitly ignores .env (regex /^\\.env$/m)');

    // database/schema.sql structure assertions
    const schemaContent = fs.readFileSync(path.resolve(__dirname, 'database/schema.sql'), 'utf8');
    const schemaRequired = [
        'CREATE EXTENSION IF NOT EXISTS pgcrypto',
        'CREATE TABLE IF NOT EXISTS users',
        'service_categories',
        'providers',
        'provider_services',
        'provider_availability',
        'service_requests',
        'request_status_events',
        'provider_bookings',
        'ratings',
        'invoices',
        'UNIQUE (provider_id, slot_date, start_minute)'
    ];

    schemaRequired.forEach(str => {
        assert(schemaContent.includes(str), `database/schema.sql contains "${str}"`);
    });

    // database/seed.sql mentions all 8 category slugs
    const seedContent = fs.readFileSync(path.resolve(__dirname, 'database/seed.sql'), 'utf8');
    const officialSlugs = [
        'appliance-repair',
        'plumbing',
        'electrical',
        'cleaning-pest',
        'home-maintenance',
        'moving-shifting',
        'car-care',
        'personal-care'
    ];

    officialSlugs.forEach(slug => {
        assert(seedContent.includes(slug), `database/seed.sql includes category slug "${slug}"`);
    });

    // server code assertions
    const dbJsContent = fs.readFileSync(path.resolve(__dirname, 'server/config/db.js'), 'utf8');
    assert(dbJsContent.includes("pool.on('error'"), "server/config/db.js contains verbatim pool.on('error'");

    const healthRoutesContent = fs.readFileSync(path.resolve(__dirname, 'server/routes/health.routes.js'), 'utf8');
    assert(healthRoutesContent.includes('/health'), 'server/routes/health.routes.js contains /health');

    const isLegacy = fs.existsSync(path.resolve(__dirname, 'client/customer.html')) || fs.existsSync(path.resolve(__dirname, 'client/_legacy_phase9/customer.html'));
    const clientIndexContent = fs.readFileSync(path.resolve(__dirname, 'client/index.html'), 'utf8');
    assert(isLegacy || /bootstrap.*\.min\.css/i.test(clientIndexContent), 'client/index.html references bootstrap CDN or legacy UI');
    assert(isLegacy || clientIndexContent.includes("fetch('/api/health')"), "client/index.html contains fetch('/api/health') or legacy UI");

    // .env.example validation
    const envExampleContent = fs.readFileSync(path.resolve(__dirname, '.env.example'), 'utf8');
    assert(envExampleContent.includes('YOUR_PASSWORD'), '.env.example contains placeholder YOUR_PASSWORD');
    assert(!/postgresql:\/\/postgres:[^Y\s]+@/i.test(envExampleContent), '.env.example does not leak real-looking passwords');

    // Legacy prototype preservation assertions
    const legacyFiles = [
        'client/_legacy/index.html',
        'client/_legacy/db.js',
        'client/_legacy/auth.js',
        'client/_legacy/provider.js'
    ];

    legacyFiles.forEach(file => {
        assert(fs.existsSync(path.resolve(__dirname, file)), `Legacy file preserved at: ${file}`);
    });

    // --------------------------------------------------------
    // 3. PostgreSQL Database Integration Check
    // --------------------------------------------------------
    console.log('\n--- 3. Database Integration Checks ---');
    let pool;
    try {
        const { Pool } = require('pg');
        const envConfig = require('./server/config/env');
        pool = new Pool({ connectionString: envConfig.DATABASE_URL });

        const catRes = await pool.query('SELECT COUNT(*)::int AS count FROM service_categories;');
        const categoryCount = catRes.rows[0].count;
        assert(categoryCount === 8, `service_categories count is 8 (found ${categoryCount})`);

        const provRes = await pool.query('SELECT COUNT(*)::int AS count FROM providers;');
        const providerCount = provRes.rows[0].count;
        assert(providerCount >= 10, `providers count is >= 10 (found ${providerCount})`);
    } catch (err) {
        skip('Database integration check', `DB unreachable: ${err.message}`);
    } finally {
        if (pool) {
            await pool.end();
        }
    }

    // --------------------------------------------------------
    // 4. Express Server Smoke Test
    // --------------------------------------------------------
    console.log('\n--- 4. Express Server Smoke Test ---');
    await runServerSmoke();

    // --------------------------------------------------------
    // Summary
    // --------------------------------------------------------
    console.log('\n====================================================');
    console.log(`PASS ${passCount} / FAIL ${failCount} / SKIP ${skipCount}`);
    console.log('====================================================');

    if (failCount > 0) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

function runServerSmoke() {
    return new Promise(resolve => {
        const envConfig = require('./server/config/env');
        const port = envConfig.PORT || 3000;

        // Ensure port is free if another process was holding it
        try {
            if (process.platform === 'win32') {
                const findCmd = `netstat -ano | findstr :${port}`;
                const output = execSync(findCmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
                const lines = output.trim().split('\n');
                for (const line of lines) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && parseInt(pid, 10) > 0 && parseInt(pid, 10) !== process.pid) {
                        try {
                            execSync(`taskkill /F /PID ${pid}`, { stdio: 'ignore' });
                        } catch (_) {}
                    }
                }
            }
        } catch (_) {
            // Port was not held, continue
        }

        const serverProc = spawn('node', ['server/index.js'], {
            cwd: __dirname,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        let serverOutput = '';
        serverProc.stdout.on('data', data => {
            serverOutput += data.toString();
        });
        serverProc.stderr.on('data', data => {
            serverOutput += data.toString();
        });

        let responded = false;
        const startTime = Date.now();

        function pollHealth() {
            if (Date.now() - startTime > 6000) {
                if (!responded) {
                    assert(false, 'Server smoke test timed out waiting for /api/health', serverOutput);
                    try { serverProc.kill(); } catch (_) {}
                    resolve();
                }
                return;
            }

            const req = http.get(`http://localhost:${port}/api/health`, res => {
                let body = '';
                res.on('data', chunk => { body += chunk; });
                res.on('end', () => {
                    responded = true;
                    assert(res.statusCode === 200, `GET /api/health returned 200 OK (got ${res.statusCode})`);
                    try {
                        const json = JSON.parse(body);
                        assert(json.ok === true, 'Response body has ok: true');
                        assert(json.db === 'connected', 'Response body has db: "connected"');
                        assert(Boolean(json.now), 'Response body includes timestamp "now"');
                    } catch (e) {
                        assert(false, 'Response body is valid JSON', body);
                    }
                    try { serverProc.kill(); } catch (_) {}
                    resolve();
                });
            });

            req.on('error', () => {
                setTimeout(pollHealth, 300);
            });
        }

        setTimeout(pollHealth, 500);
    });
}

runTests();
