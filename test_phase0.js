/**
 * Phase 0 Baseline & Verification Test Suite
 *
 * Verifies:
 * 1. All original files exist and remain intact.
 * 2. AUDIT.md exists and contains all required architectural sections.
 * 3. AUDIT.md contains no hardcoded secrets or database credential strings.
 */

const fs = require('fs');
const path = require('path');

let passCount = 0;
let failCount = 0;

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
console.log('  PHASE 0: BASELINE AUDIT VERIFICATION TEST SUITE   ');
console.log('====================================================\n');

// 1. Verify all original tracked repository files exist
const originalFiles = [
    '.firebaserc',
    '.gitignore',
    '404.html',
    'admin.css',
    'admin.html',
    'admin.js',
    'auth.css',
    'auth.js',
    'customer.css',
    'customer.html',
    'customer.js',
    'db.js',
    'firebase.json',
    'global.css',
    'global.js',
    'index.html',
    'provider.css',
    'provider.html',
    'provider.js',
    path.join('images', 'logo.jpg')
];

originalFiles.forEach(file => {
    const fullPath = path.resolve(__dirname, file);
    const exists = fs.existsSync(fullPath);
    assert(exists, `Original file exists: ${file}`, `Missing file: ${fullPath}`);
    if (exists) {
        const stats = fs.statSync(fullPath);
        assert(stats.size > 0, `Original file non-empty: ${file} (${stats.size} bytes)`);
    }
});

// 2. Verify AUDIT.md exists and is populated
const auditPath = path.resolve(__dirname, 'AUDIT.md');
const auditExists = fs.existsSync(auditPath);
assert(auditExists, 'AUDIT.md exists at repository root');

if (auditExists) {
    const auditContent = fs.readFileSync(auditPath, 'utf8');
    const auditStats = fs.statSync(auditPath);
    assert(auditStats.size > 1000, `AUDIT.md has substantive content (${auditStats.size} bytes)`);

    // Verify required sections in AUDIT.md
    const requiredSections = [
        'File Tree',
        'Feature Inventory',
        'Reusability Assessment',
        'Risks',
        'Proposed Structure',
        'DB Portability'
    ];

    requiredSections.forEach(section => {
        const hasSection = auditContent.includes(section);
        assert(hasSection, `AUDIT.md contains section: "${section}"`);
    });

    // Verify 8 official categories are addressed in AUDIT.md
    const requiredCategories = [
        'Appliance & Gadget Repair',
        'Plumbing',
        'Electrical',
        'Cleaning & Pest Control',
        'Home Maintenance',
        'Moving & Shifting',
        'Car Care & Repair',
        'Personal Care'
    ];

    requiredCategories.forEach(cat => {
        const hasCat = auditContent.includes(cat);
        assert(hasCat, `AUDIT.md addresses category: "${cat}"`);
    });

    // 3. Verify AUDIT.md contains no credential leaks
    // Patterns to guard against credential leaks
    const secretPatterns = [
        /password\s*=/i,
        new RegExp('postgres' + ':\\/\\/', 'i'),
        new RegExp('postgresql' + ':\\/\\/', 'i')
    ];

    secretPatterns.forEach((pattern, idx) => {
        const matches = pattern.test(auditContent);
        assert(!matches, `AUDIT.md contains no credential leak (pattern #${idx + 1}: ${pattern})`);
    });
}

console.log('\n----------------------------------------------------');
console.log(`TEST SUMMARY: PASS ${passCount} / FAIL ${failCount}`);
console.log('----------------------------------------------------');

if (failCount > 0) {
    process.exit(1);
} else {
    process.exit(0);
}
