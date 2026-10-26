const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const scheduling = require('../services/scheduling.service');

router.get('/', async (req, res, next) => {
    try {
        const { category_slug, search } = req.query;
        let query = `
            SELECT p.id, u.full_name AS name, p.headline, p.rating, p.rating_count,
                   p.address, p.years_experience,
                   sc.slug AS category_slug, sc.name AS category,
                   ps.price AS price_per_hour
            FROM providers p
            JOIN users u ON u.id = p.user_id
            JOIN provider_services ps ON ps.provider_id = p.id
            JOIN service_categories sc ON sc.id = ps.category_id
            WHERE p.is_active = TRUE
        `;
        const params = [];
        if (category_slug) {
            params.push(category_slug);
            query += ` AND sc.slug = $${params.length}`;
        }
        if (search) {
            params.push(`%${search.trim().toLowerCase()}%`);
            query += ` AND (LOWER(u.full_name) LIKE $${params.length} OR LOWER(sc.name) LIKE $${params.length} OR LOWER(p.headline) LIKE $${params.length})`;
        }
        query += ' ORDER BY p.rating DESC, p.id ASC;';
        const result = await pool.query(query, params);
        res.json({ ok: true, providers: result.rows });
    } catch (e) {
        next(e);
    }
});

router.get('/:id/slots', async (req, res, next) => {
    try {
        const { date, category_slug } = req.query;
        if (!date || !category_slug) {
            return res.status(400).json({ ok: false, error: 'date and category_slug required' });
        }
        const result = await scheduling.getSlots(Number(req.params.id), date, category_slug);
        res.json({ ok: true, ...result });
    } catch (e) {
        if (e.status === 404 || e.message === 'provider not found or does not serve category') {
            return res.status(404).json({ ok: false, error: 'provider not found or does not serve category' });
        }
        next(e);
    }
});

module.exports = router;
