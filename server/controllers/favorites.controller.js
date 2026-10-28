const { pool } = require('../config/db');

async function toggleFavorite(req, res, next) {
    try {
        const { provider_id } = req.body || {};
        const provId = parseInt(provider_id, 10);
        if (isNaN(provId)) {
            return res.status(400).json({ ok: false, error: 'valid provider_id is required' });
        }

        const existing = await pool.query(
            'SELECT id FROM favorites WHERE user_id = $1 AND provider_id = $2;',
            [req.user.id, provId]
        );

        if (existing.rows.length > 0) {
            await pool.query('DELETE FROM favorites WHERE id = $1;', [existing.rows[0].id]);
            return res.status(200).json({ ok: true, favorited: false });
        } else {
            await pool.query(
                'INSERT INTO favorites (user_id, provider_id) VALUES ($1, $2) ON CONFLICT (user_id, provider_id) DO NOTHING;',
                [req.user.id, provId]
            );
            return res.status(200).json({ ok: true, favorited: true });
        }
    } catch (err) {
        return next(err);
    }
}

async function getMine(req, res, next) {
    try {
        const result = await pool.query(`
            SELECT f.id AS favorite_id, f.created_at AS favorited_at,
                   p.id, u.full_name AS name, p.headline, p.rating, p.rating_count,
                   p.address, p.years_experience,
                   COALESCE((SELECT sc.name FROM provider_services ps JOIN service_categories sc ON sc.id = ps.category_id WHERE ps.provider_id = p.id LIMIT 1), 'General') AS category,
                   COALESCE((SELECT sc.slug FROM provider_services ps JOIN service_categories sc ON sc.id = ps.category_id WHERE ps.provider_id = p.id LIMIT 1), 'general') AS category_slug,
                   COALESCE((SELECT ps.price FROM provider_services ps WHERE ps.provider_id = p.id LIMIT 1), 500) AS price_per_hour
            FROM favorites f
            JOIN providers p ON p.id = f.provider_id
            JOIN users u ON u.id = p.user_id
            WHERE f.user_id = $1
            ORDER BY f.created_at DESC;
        `, [req.user.id]);

        const providerIds = result.rows.map(r => parseInt(r.id, 10));
        return res.status(200).json({
            ok: true,
            favorites: result.rows,
            favorite_provider_ids: providerIds
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    toggleFavorite,
    getMine
};
