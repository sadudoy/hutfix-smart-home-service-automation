const { pool } = require('../config/db');

async function getStats(req, res, next) {
    try {
        const bookingsRes = await pool.query('SELECT COUNT(*)::int AS count FROM service_requests;');
        const revenueRes = await pool.query('SELECT COALESCE(SUM(total), 0)::numeric AS sum FROM invoices;');
        const providersRes = await pool.query('SELECT COUNT(*)::int AS count FROM providers;');
        const usersRes = await pool.query('SELECT COUNT(*)::int AS count FROM users;');

        const provsRes = await pool.query(`
            SELECT p.id, u.full_name AS name, p.address, p.rating, p.rating_count,
                   COALESCE((SELECT ps.price FROM provider_services ps WHERE ps.provider_id = p.id LIMIT 1), 500) AS price_per_hour,
                   COALESCE((SELECT sc.name FROM provider_services ps JOIN service_categories sc ON sc.id = ps.category_id WHERE ps.provider_id = p.id LIMIT 1), 'General') AS category
            FROM providers p
            JOIN users u ON u.id = p.user_id
            ORDER BY p.id ASC;
        `);

        const usersListRes = await pool.query(`
            SELECT id, full_name AS name, email, role, phone, created_at
            FROM users
            ORDER BY id DESC;
        `);

        return res.status(200).json({
            ok: true,
            stats: {
                total_bookings: bookingsRes.rows[0].count,
                total_revenue: Number(revenueRes.rows[0].sum),
                total_providers: providersRes.rows[0].count,
                total_users: usersRes.rows[0].count,
                totalBookings: bookingsRes.rows[0].count,
                totalRevenue: Number(revenueRes.rows[0].sum),
                totalProviders: providersRes.rows[0].count,
                totalUsers: usersRes.rows[0].count
            },
            providers: provsRes.rows,
            users: usersListRes.rows
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getStats
};
