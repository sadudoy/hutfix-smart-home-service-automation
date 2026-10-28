const { pool } = require('../config/db');

async function getGigDetails(req, res, next) {
    try {
        const providerId = parseInt(req.params.providerId, 10);
        if (isNaN(providerId)) {
            return res.status(400).json({ ok: false, error: 'invalid provider id' });
        }

        // 1. Fetch provider details
        const providerQuery = `
            SELECT p.id, u.full_name, p.headline, p.bio, p.rating, p.rating_count, p.address, p.years_experience,
                   p.logo_url, p.banner_url
            FROM providers p
            JOIN users u ON u.id = p.user_id
            WHERE p.id = $1;
        `;
        const providerRes = await pool.query(providerQuery, [providerId]);
        if (providerRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Provider not found' });
        }
        const providerData = providerRes.rows[0];

        // 2. Fetch services
        const servicesQuery = `
            SELECT ps.id, ps.price, ps.title, ps.description, ps.duration_minutes, ps.banner_url,
                   sc.id AS category_id, sc.slug AS category_slug, sc.name AS category_name
            FROM provider_services ps
            JOIN service_categories sc ON sc.id = ps.category_id
            WHERE ps.provider_id = $1
            ORDER BY sc.name ASC;
        `;
        const servicesRes = await pool.query(servicesQuery, [providerId]);

        // 3. Fetch reviews
        const reviewsQuery = `
            SELECT r.stars, r.comment, r.created_at, u.full_name AS customer_name
            FROM ratings r
            JOIN users u ON u.id = r.customer_id
            WHERE r.provider_id = $1
            ORDER BY r.created_at DESC
            LIMIT 20;
        `;
        const reviewsRes = await pool.query(reviewsQuery, [providerId]);

        // 4. Fetch rating breakdown
        const breakdownQuery = `
            SELECT stars, COUNT(*)::int AS count
            FROM ratings
            WHERE provider_id = $1
            GROUP BY stars
            ORDER BY stars DESC;
        `;
        const breakdownRes = await pool.query(breakdownQuery, [providerId]);

        return res.status(200).json({
            ok: true,
            provider: {
                ...providerData,
                services: servicesRes.rows
            },
            reviews: reviewsRes.rows,
            ratingBreakdown: breakdownRes.rows
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getGigDetails
};
