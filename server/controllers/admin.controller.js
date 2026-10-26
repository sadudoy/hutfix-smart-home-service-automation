const { pool } = require('../config/db');

async function getStats(req, res, next) {
    try {
        const bookingsRes = await pool.query('SELECT COUNT(*)::int AS count FROM service_requests;');
        const completedRes = await pool.query("SELECT COUNT(*)::int AS count FROM service_requests WHERE status = 'completed';");
        const pendingRes = await pool.query("SELECT COUNT(*)::int AS count FROM service_requests WHERE status = 'requested';");
        const revenueRes = await pool.query('SELECT COALESCE(SUM(total), 0)::numeric AS sum, COALESCE(SUM(tax), 0)::numeric AS tax_sum FROM invoices;');
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
            ORDER BY created_at DESC
            LIMIT 100;
        `);

        const grossVolume = Number(revenueRes.rows[0].sum);
        const platformRevenue = Number(revenueRes.rows[0].tax_sum);

        return res.status(200).json({
            ok: true,
            stats: {
                total_bookings: bookingsRes.rows[0].count,
                completed_bookings: completedRes.rows[0].count,
                gross_volume: grossVolume,
                platform_revenue: platformRevenue,
                total_revenue: grossVolume,
                total_providers: providersRes.rows[0].count,
                total_users: usersRes.rows[0].count,
                pending_requests: pendingRes.rows[0].count,
                // CamelCase fallbacks
                totalBookings: bookingsRes.rows[0].count,
                completedBookings: completedRes.rows[0].count,
                totalRevenue: grossVolume,
                totalProviders: providersRes.rows[0].count,
                totalUsers: usersRes.rows[0].count,
                pendingRequests: pendingRes.rows[0].count
            },
            providers: provsRes.rows,
            users: usersListRes.rows
        });
    } catch (err) {
        return next(err);
    }
}

async function getUsers(req, res, next) {
    try {
        const result = await pool.query(`
            SELECT id, email, full_name, phone, role, created_at
            FROM users
            ORDER BY created_at DESC
            LIMIT 100;
        `);
        return res.status(200).json({
            ok: true,
            users: result.rows
        });
    } catch (err) {
        return next(err);
    }
}

async function getBookings(req, res, next) {
    try {
        const result = await pool.query(`
            SELECT sr.id, sr.status, sr.estimated_price, sr.preferred_date, sr.preferred_start_minute,
                   sc.name AS category_name, cu.full_name AS customer_name, pu.full_name AS provider_name
            FROM service_requests sr
            JOIN service_categories sc ON sc.id = sr.category_id
            JOIN users cu ON cu.id = sr.customer_id
            LEFT JOIN providers p ON p.id = sr.assigned_provider_id
            LEFT JOIN users pu ON pu.id = p.user_id
            ORDER BY sr.created_at DESC
            LIMIT 100;
        `);
        return res.status(200).json({
            ok: true,
            bookings: result.rows
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getStats,
    getUsers,
    getBookings
};
