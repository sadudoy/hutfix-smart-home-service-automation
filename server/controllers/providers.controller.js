const { pool } = require('../config/db');

async function getProviderProfileByUserId(req, res, next) {
    try {
        const targetUserId = parseInt(req.params.userId, 10);
        if (isNaN(targetUserId)) {
            return res.status(400).json({ ok: false, error: 'invalid user id' });
        }

        // Provider can only fetch their own profile; admin can fetch any
        if (req.user.role === 'provider' && req.user.id !== targetUserId) {
            return res.status(403).json({ ok: false, error: 'forbidden: cannot view other provider profile' });
        }

        const provRes = await pool.query(`
            SELECT p.id, p.user_id, u.full_name, p.headline, p.bio, p.rating, p.rating_count, p.address, p.years_experience,
                   p.logo_url, p.banner_url
            FROM providers p
            JOIN users u ON u.id = p.user_id
            WHERE p.user_id = $1;
        `, [targetUserId]);

        if (provRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'provider not found' });
        }

        const prov = provRes.rows[0];

        const servRes = await pool.query(`
            SELECT ps.id, ps.category_id, sc.slug AS category_slug, sc.name AS category_name, ps.price
            FROM provider_services ps
            JOIN service_categories sc ON sc.id = ps.category_id
            WHERE ps.provider_id = $1;
        `, [prov.id]);

        return res.status(200).json({
            ok: true,
            provider: {
                id: prov.id,
                user_id: prov.user_id,
                full_name: prov.full_name,
                headline: prov.headline || '',
                bio: prov.bio || '',
                rating: Number(prov.rating) || 0,
                rating_count: prov.rating_count || 0,
                address: prov.address || '',
                years_experience: prov.years_experience || 0,
                logo_url: prov.logo_url || null,
                banner_url: prov.banner_url || null,
                services: servRes.rows.map(s => ({
                    id: s.id,
                    category_id: s.category_id,
                    category_slug: s.category_slug,
                    category_name: s.category_name,
                    price: Number(s.price)
                }))
            }
        });
    } catch (err) {
        return next(err);
    }
}

async function search(req, res, next) {
    try {
        const { category_slug, search: searchQuery, min_rating, max_price, sort } = req.query;
        let query = `
            SELECT p.id, u.full_name AS name, p.headline, p.rating, p.rating_count,
                   p.address, p.years_experience, p.logo_url, p.banner_url,
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

        if (searchQuery) {
            params.push(`%${searchQuery.trim().toLowerCase()}%`);
            query += ` AND (LOWER(u.full_name) LIKE $${params.length} OR LOWER(sc.name) LIKE $${params.length} OR LOWER(p.headline) LIKE $${params.length})`;
        }

        if (min_rating != null && min_rating !== '') {
            const minR = parseFloat(min_rating);
            if (!isNaN(minR)) {
                params.push(minR);
                query += ` AND p.rating >= $${params.length}`;
            }
        }

        if (max_price != null && max_price !== '') {
            const maxP = parseFloat(max_price);
            if (!isNaN(maxP)) {
                params.push(maxP);
                query += ` AND ps.price <= $${params.length}`;
            }
        }

        let orderClause = ' ORDER BY p.rating DESC, p.id ASC;';
        if (sort === 'rating_desc' || sort === 'rating') {
            orderClause = ' ORDER BY p.rating DESC, p.id ASC;';
        } else if (sort === 'price_asc') {
            orderClause = ' ORDER BY ps.price ASC, p.id ASC;';
        } else if (sort === 'price_desc') {
            orderClause = ' ORDER BY ps.price DESC, p.id ASC;';
        }

        query += orderClause;

        const result = await pool.query(query, params);
        return res.status(200).json({ ok: true, providers: result.rows });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getProviderProfileByUserId,
    search
};
