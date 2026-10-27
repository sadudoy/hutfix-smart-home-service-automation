const { pool } = require('../server/config/db');

async function reset() {
  await pool.query(`
    WITH h AS (SELECT crypt('demo1234', gen_salt('bf', 10)) AS p)
    UPDATE users SET password_hash = h.p FROM h
    WHERE email IN ('customer@demo.test', 'provider@demo.test', 'admin@demo.test');
  `);
  console.log('Demo passwords successfully reset to demo1234');
  process.exit(0);
}

reset().catch(err => {
  console.error('Reset error:', err);
  process.exit(1);
});
