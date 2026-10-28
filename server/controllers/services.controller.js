const { pool } = require('../config/db');

async function list(req, res, next) {
    try {
        const query = 'SELECT id, slug, name, icon, description, base_price FROM service_categories ORDER BY id ASC;';
        const result = await pool.query(query);
        return res.status(200).json({
            ok: true,
            services: result.rows,
            categories: result.rows
        });
    } catch (err) {
        return next(err);
    }
}

async function getBySlug(req, res, next) {
    try {
        const { slug } = req.params;
        const query = 'SELECT id, slug, name, icon, description, base_price FROM service_categories WHERE slug = $1;';
        const result = await pool.query(query, [slug]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                error: 'service category not found'
            });
        }

        return res.status(200).json({
            ok: true,
            service: result.rows[0]
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    list,
    getBySlug
};
