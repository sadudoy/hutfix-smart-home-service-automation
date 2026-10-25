const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/health', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW() AS now;');
        return res.status(200).json({
            ok: true,
            db: 'connected',
            now: result.rows[0].now
        });
    } catch (err) {
        return res.status(500).json({
            ok: false,
            db: 'disconnected',
            error: err.message
        });
    }
});

module.exports = router;
