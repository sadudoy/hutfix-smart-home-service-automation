const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');

router.get('/', async (req, res, next) => {
    try {
        const rows = (await pool.query('SELECT key, value FROM platform_settings;')).rows;
        const settings = {};
        rows.forEach(r => { settings[r.key] = r.value; });
        return res.status(200).json({ ok: true, settings });
    } catch (err) {
        return next(err);
    }
});

module.exports = router;
