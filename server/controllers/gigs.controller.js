const { pool } = require('../config/db');

async function getGigDetails(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ ok: false, error: 'invalid id' });
        }

        const query = `
            SELECT ps.id, ps.title, ps.description, ps.duration_minutes, ps.price, ps.banner_url,
                   sc.name AS category_name, sc.slug AS category_slug,
                   p.id AS provider_id, u.full_name AS provider_name, p.rating AS provider_rating,
                   p.logo_url AS provider_logo_url, p.years_experience AS provider_years_experience
            FROM provider_services ps
            JOIN service_categories sc ON sc.id = ps.category_id
            JOIN providers p ON p.id = ps.provider_id
            JOIN users u ON u.id = p.user_id
            WHERE ps.id = $1;
        `;
        const result = await pool.query(query, [id]);

        if (result.rows.length === 0) {
            // Backwards compatibility fallback if ID refers to a provider
            const provRes = await pool.query(`
                SELECT p.id, u.full_name, p.headline, p.bio, p.rating, p.rating_count, p.address, p.years_experience,
                       p.logo_url, p.banner_url
                FROM providers p
                JOIN users u ON u.id = p.user_id
                WHERE p.id = $1;
            `, [id]);

            if (provRes.rows.length > 0) {
                const prov = provRes.rows[0];
                const servRes = await pool.query(`
                    SELECT ps.id, ps.price, ps.title, ps.description, ps.duration_minutes, ps.banner_url,
                           sc.id AS category_id, sc.slug AS category_slug, sc.name AS category_name
                    FROM provider_services ps
                    JOIN service_categories sc ON sc.id = ps.category_id
                    WHERE ps.provider_id = $1
                    ORDER BY sc.name ASC;
                `, [id]);

                const firstService = servRes.rows[0] || {};
                const fallbackGig = {
                    id: firstService.id || id,
                    title: firstService.title || 'Specialist Gig',
                    description: firstService.description || prov.bio || '',
                    duration_minutes: firstService.duration_minutes || 60,
                    price: firstService.price || 0,
                    banner_url: firstService.banner_url || prov.banner_url,
                    category_name: firstService.category_name || 'General',
                    category_slug: firstService.category_slug || 'general',
                    provider_id: prov.id,
                    provider_name: prov.full_name,
                    provider_rating: prov.rating,
                    provider_logo_url: prov.logo_url,
                    provider_years_experience: prov.years_experience
                };

                return res.status(200).json({
                    ok: true,
                    gig: fallbackGig,
                    provider: {
                        ...prov,
                        services: servRes.rows
                    }
                });
            }

            return res.status(404).json({ ok: false, error: 'Gig not found' });
        }

        const gig = result.rows[0];

        // Also fetch provider services for backwards compatibility with tests expecting provider.services
        const provServicesRes = await pool.query(`
            SELECT ps.id, ps.price, ps.title, ps.description, ps.duration_minutes, ps.banner_url,
                   sc.id AS category_id, sc.slug AS category_slug, sc.name AS category_name
            FROM provider_services ps
            JOIN service_categories sc ON sc.id = ps.category_id
            WHERE ps.provider_id = $1
            ORDER BY sc.name ASC;
        `, [gig.provider_id]);

        return res.status(200).json({
            ok: true,
            gig,
            provider: {
                id: gig.provider_id,
                full_name: gig.provider_name,
                rating: gig.provider_rating,
                services: provServicesRes.rows
            }
        });
    } catch (err) {
        return next(err);
    }
}

async function getGigReviews(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id) || id <= 0) {
            return res.status(400).json({ ok: false, error: 'invalid id' });
        }

        // First, query provider_id and category_id from provider_services for this ID
        const psRes = await pool.query(
            'SELECT provider_id, category_id FROM provider_services WHERE id = $1',
            [id]
        );

        if (psRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Gig not found' });
        }

        const { provider_id, category_id } = psRes.rows[0];

        // Query: SELECT r.stars, r.comment, r.created_at, u.full_name AS customer_name FROM ratings r JOIN service_requests sr ON sr.id = r.request_id JOIN users u ON u.id = r.customer_id WHERE r.provider_id = $1 AND sr.category_id = $2 ORDER BY r.created_at DESC
        const reviewsRes = await pool.query(`
            SELECT r.stars, r.comment, r.created_at, u.full_name AS customer_name
            FROM ratings r
            JOIN service_requests sr ON sr.id = r.request_id
            JOIN users u ON u.id = r.customer_id
            WHERE r.provider_id = $1 AND sr.category_id = $2
            ORDER BY r.created_at DESC;
        `, [provider_id, category_id]);

        return res.status(200).json({
            ok: true,
            reviews: reviewsRes.rows
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getGigDetails,
    getGigReviews
};
