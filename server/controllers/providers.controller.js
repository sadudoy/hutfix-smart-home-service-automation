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
            SELECT p.id, p.user_id, u.full_name, p.headline, p.bio, p.rating, p.rating_count, p.address, p.years_experience
            FROM providers p
            JOIN users u ON u.id = p.user_id
            WHERE p.user_id = $1;
        `, [targetUserId]);

        if (provRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'provider not found' });
        }

        const prov = provRes.rows[0];

        const servRes = await pool.query(`
            SELECT ps.category_id, sc.slug AS category_slug, sc.name AS category_name, ps.price
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
                services: servRes.rows.map(s => ({
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

module.exports = {
    getProviderProfileByUserId
};
