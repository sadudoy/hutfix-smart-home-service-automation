const { Pool, types } = require('pg');
types.setTypeParser(1082, (str) => str); // DATE → 'YYYY-MM-DD' string

const { DATABASE_URL, NODE_ENV } = require('./env');

const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => { console.error('[pg pool error]', err); });

async function query(text, params) {
    const start = Date.now();
    try {
        const res = await pool.query(text, params);
        const duration = Date.now() - start;
        if (NODE_ENV === 'development' && duration > 100) {
            console.warn(`[slow query: ${duration}ms] ${text}`);
        }
        return res;
    } catch (err) {
        console.error(`[db query error] ${err.message} on query: ${text}`);
        throw err;
    }
}

module.exports = {
    pool,
    query
};
