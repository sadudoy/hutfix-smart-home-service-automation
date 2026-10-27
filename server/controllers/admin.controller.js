const { pool } = require('../config/db');
const sseService = require('../services/sse.service');
const notificationsService = require('../services/notifications.service');

async function getStats(req, res, next) {
    try {
        const bookingsRes = await pool.query('SELECT COUNT(*)::int AS count FROM service_requests;');
        const completedRes = await pool.query("SELECT COUNT(*)::int AS count FROM service_requests WHERE status = 'completed';");
        const pendingRes = await pool.query("SELECT COUNT(*)::int AS count FROM service_requests WHERE status = 'requested';");
        const revenueRes = await pool.query('SELECT COALESCE(SUM(total), 0)::numeric AS sum, COALESCE(SUM(tax), 0)::numeric AS tax_sum FROM invoices;');
        const providersRes = await pool.query('SELECT COUNT(*)::int AS count FROM providers;');
        const usersRes = await pool.query('SELECT COUNT(*)::int AS count FROM users;');
        const pendingPaymentsRes = await pool.query("SELECT COUNT(*)::int AS count FROM service_requests WHERE payment_status = 'pending' AND payment_method IS NOT NULL;");
        const openDisputesRes = await pool.query("SELECT COUNT(*)::int AS count FROM disputes WHERE status = 'open';");
        const pendingPayoutsRes = await pool.query("SELECT COUNT(*)::int AS count FROM payout_requests WHERE status = 'pending';");

        const provsRes = await pool.query(`
            SELECT p.id, u.full_name AS name, p.address, p.rating, p.rating_count, p.is_active,
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
                pending_payments: pendingPaymentsRes.rows[0].count,
                open_disputes: openDisputesRes.rows[0].count,
                pending_payouts: pendingPayoutsRes.rows[0].count,
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
        const page = req.query.page ? parseInt(req.query.page, 10) : null;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

        const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM users;');
        const total = countRes.rows[0].count;

        let query = `
            SELECT u.id, u.email, u.full_name, u.phone, u.role, u.created_at,
                   p.id AS provider_id, p.is_active AS provider_active
            FROM users u
            LEFT JOIN providers p ON p.user_id = u.id
            ORDER BY u.created_at DESC
        `;
        const params = [];

        if (limit != null && !isNaN(limit)) {
            const p = page && !isNaN(page) && page > 0 ? page : 1;
            const offset = (p - 1) * limit;
            query += ` LIMIT $1 OFFSET $2;`;
            params.push(limit, offset);
        } else {
            query += ` LIMIT 100;`;
        }

        const result = await pool.query(query, params);
        return res.status(200).json({
            ok: true,
            users: result.rows,
            total,
            page: page || 1,
            limit: limit || result.rows.length
        });
    } catch (err) {
        return next(err);
    }
}

async function getBookings(req, res, next) {
    try {
        const page = req.query.page ? parseInt(req.query.page, 10) : null;
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : null;

        const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM service_requests;');
        const total = countRes.rows[0].count;

        let query = `
            SELECT sr.id, sr.status, sr.estimated_price, sr.preferred_date, sr.preferred_start_minute,
                   sr.payment_method, sr.payment_status, sr.trx_id, sr.sender_number,
                   sc.name AS category_name, cu.full_name AS customer_name, pu.full_name AS provider_name
            FROM service_requests sr
            JOIN service_categories sc ON sc.id = sr.category_id
            JOIN users cu ON cu.id = sr.customer_id
            LEFT JOIN providers p ON p.id = sr.assigned_provider_id
            LEFT JOIN users pu ON pu.id = p.user_id
            ORDER BY sr.created_at DESC
        `;
        const params = [];

        if (limit != null && !isNaN(limit)) {
            const p = page && !isNaN(page) && page > 0 ? page : 1;
            const offset = (p - 1) * limit;
            query += ` LIMIT $1 OFFSET $2;`;
            params.push(limit, offset);
        } else {
            query += ` LIMIT 100;`;
        }

        const result = await pool.query(query, params);
        return res.status(200).json({
            ok: true,
            bookings: result.rows,
            total,
            page: page || 1,
            limit: limit || result.rows.length
        });
    } catch (err) {
        return next(err);
    }
}

async function toggleVerifyUser(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ ok: false, error: 'invalid user id' });
        }

        let check = await pool.query('SELECT id, is_active FROM providers WHERE user_id = $1;', [id]);
        if (check.rows.length === 0) {
            check = await pool.query('SELECT id, is_active FROM providers WHERE id = $1;', [id]);
        }
        if (check.rows.length > 0) {
            const newStatus = !check.rows[0].is_active;
            const updated = await pool.query(
                'UPDATE providers SET is_active = $1 WHERE id = $2 RETURNING *;',
                [newStatus, check.rows[0].id]
            );
            return res.status(200).json({
                ok: true,
                is_active: updated.rows[0].is_active,
                provider: updated.rows[0]
            });
        }
        return res.status(404).json({ ok: false, error: 'provider not found for user' });
    } catch (err) {
        return next(err);
    }
}

async function assignBooking(req, res, next) {
    const client = await pool.connect();
    try {
        const id = parseInt(req.params.id, 10);
        const { provider_id } = req.body || {};
        if (isNaN(id) || !provider_id) {
            client.release();
            return res.status(400).json({ ok: false, error: 'valid request id and provider_id are required' });
        }
        const provId = parseInt(provider_id, 10);

        await client.query('BEGIN');
        const reqRes = await client.query('SELECT * FROM service_requests WHERE id = $1 FOR UPDATE;', [id]);
        if (reqRes.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ ok: false, error: 'request not found' });
        }
        const reqRow = reqRes.rows[0];

        // Clear existing booking slot for this request
        await client.query('DELETE FROM provider_bookings WHERE request_id = $1;', [id]);

        if (reqRow.status !== 'completed' && reqRow.status !== 'cancelled') {
            await client.query(`
                INSERT INTO provider_bookings (provider_id, request_id, slot_date, start_minute, end_minute)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (provider_id, slot_date, start_minute) DO NOTHING;
            `, [provId, id, reqRow.preferred_date, reqRow.preferred_start_minute, reqRow.preferred_end_minute]);
        }

        const updated = await client.query(`
            UPDATE service_requests
            SET assigned_provider_id = $1, status = 'accepted', updated_at = NOW()
            WHERE id = $2
            RETURNING *;
        `, [provId, id]);

        await client.query(`
            INSERT INTO request_status_events (request_id, status, note, created_by_user_id)
            VALUES ($1, 'accepted', 'Assigned to provider by admin', $2);
        `, [id, req.user.id]);

        await client.query('COMMIT');
        client.release();

        sseService.broadcast(id, { type: 'assigned', request: updated.rows[0] });

        return res.status(200).json({ ok: true, request: updated.rows[0] });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
        return next(err);
    }
}

async function getDisputes(req, res, next) {
    try {
        const result = await pool.query(`
            SELECT d.*, sr.address, sr.status AS request_status,
                   u.full_name AS raised_by_name, u.email AS raised_by_email
            FROM disputes d
            JOIN service_requests sr ON sr.id = d.request_id
            JOIN users u ON u.id = d.raised_by_user_id
            ORDER BY d.created_at DESC;
        `);
        return res.status(200).json({ ok: true, disputes: result.rows });
    } catch (err) {
        return next(err);
    }
}

async function createDispute(req, res, next) {
    try {
        const { request_id, reason } = req.body || {};
        if (!request_id || !reason) {
            return res.status(400).json({ ok: false, error: 'request_id and reason are required' });
        }
        const result = await pool.query(
            'INSERT INTO disputes (request_id, raised_by_user_id, reason, status) VALUES ($1, $2, $3, $4) RETURNING *;',
            [parseInt(request_id, 10), req.user.id, reason, 'open']
        );
        return res.status(201).json({ ok: true, dispute: result.rows[0] });
    } catch (err) {
        return next(err);
    }
}

async function resolveDispute(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const { status } = req.body || {};
        if (isNaN(id) || !['resolved', 'rejected'].includes(status)) {
            return res.status(400).json({ ok: false, error: 'valid status (resolved|rejected) required' });
        }
        const updated = await pool.query(
            'UPDATE disputes SET status = $1 WHERE id = $2 RETURNING *;',
            [status, id]
        );
        if (updated.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'dispute not found' });
        }
        return res.status(200).json({ ok: true, dispute: updated.rows[0] });
    } catch (err) {
        return next(err);
    }
}

async function getPayments(req, res, next) {
    try {
        const result = await pool.query(`
            SELECT sr.id, sr.customer_id, sr.status, sr.estimated_price, sr.preferred_date,
                   sr.payment_method, sr.trx_id, sr.sender_number, sr.payment_status, sr.created_at,
                   cu.full_name AS customer_name, cu.email AS customer_email, cu.phone AS customer_phone,
                   sc.name AS category_name
            FROM service_requests sr
            JOIN users cu ON cu.id = sr.customer_id
            JOIN service_categories sc ON sc.id = sr.category_id
            WHERE sr.payment_method IS NOT NULL
            ORDER BY sr.created_at DESC;
        `);
        return res.status(200).json({
            ok: true,
            payments: result.rows
        });
    } catch (err) {
        return next(err);
    }
}

async function verifyPayment(req, res, next) {
    const client = await pool.connect();
    try {
        const id = parseInt(req.params.id, 10);
        const { action, status } = req.body || {};
        const chosenAction = action || status;

        if (isNaN(id) || !['verify', 'verified', 'reject', 'rejected'].includes(chosenAction)) {
            client.release();
            return res.status(400).json({ ok: false, error: 'valid action (verify|reject) required' });
        }

        const isApprove = chosenAction === 'verify' || chosenAction === 'verified';
        await client.query('BEGIN');

        const reqRes = await client.query('SELECT * FROM service_requests WHERE id = $1 FOR UPDATE;', [id]);
        if (reqRes.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(404).json({ ok: false, error: 'request not found' });
        }
        const existing = reqRes.rows[0];

        let updated;
        if (isApprove) {
            const updateRes = await client.query(`
                UPDATE service_requests
                SET payment_status = 'verified', updated_at = NOW()
                WHERE id = $1
                RETURNING *;
            `, [id]);
            updated = updateRes.rows[0];

            await notificationsService.notify(client, {
                userId: existing.customer_id,
                requestId: id,
                kind: 'payment_verified',
                title: 'Payment Verified',
                body: `Your payment of ৳${existing.estimated_price || 0} via ${existing.payment_method || 'bKash'} has been verified.`
            });
        } else {
            // Reject: cancel booking and free slot
            const updateRes = await client.query(`
                UPDATE service_requests
                SET payment_status = 'rejected', status = 'cancelled', updated_at = NOW()
                WHERE id = $1
                RETURNING *;
            `, [id]);
            updated = updateRes.rows[0];

            await client.query('DELETE FROM provider_bookings WHERE request_id = $1;', [id]);

            await client.query(`
                INSERT INTO request_status_events (request_id, status, note, created_by_user_id)
                VALUES ($1, 'cancelled', 'Payment proof rejected by admin', $2);
            `, [id, req.user.id]);

            await notificationsService.notify(client, {
                userId: existing.customer_id,
                requestId: id,
                kind: 'payment_rejected',
                title: 'Payment Proof Rejected',
                body: `Your payment for request #${id} was rejected. The booking has been cancelled.`
            });
        }

        await client.query('COMMIT');
        client.release();

        sseService.broadcast(id, {
            type: 'payment_update',
            payment_status: updated.payment_status,
            status: updated.status
        });

        return res.status(200).json({
            ok: true,
            request: updated
        });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
        return next(err);
    }
}

async function getPayouts(req, res, next) {
    try {
        const result = await pool.query(`
            SELECT pr.*, u.full_name AS provider_name, u.email AS provider_email, u.phone AS provider_phone
            FROM payout_requests pr
            JOIN providers p ON p.id = pr.provider_id
            JOIN users u ON u.id = p.user_id
            ORDER BY pr.created_at DESC;
        `);
        return res.status(200).json({
            ok: true,
            payouts: result.rows
        });
    } catch (err) {
        return next(err);
    }
}

async function approvePayout(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const { action } = req.body || {};
        if (isNaN(id)) {
            return res.status(400).json({ ok: false, error: 'invalid payout id' });
        }
        const newStatus = action === 'reject' ? 'rejected' : 'completed';
        const updated = await pool.query(
            'UPDATE payout_requests SET status = $1 WHERE id = $2 RETURNING *;',
            [newStatus, id]
        );
        if (updated.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'payout request not found' });
        }
        return res.status(200).json({
            ok: true,
            payout: updated.rows[0]
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getStats,
    getUsers,
    getBookings,
    toggleVerifyUser,
    assignBooking,
    getDisputes,
    createDispute,
    resolveDispute,
    getPayments,
    verifyPayment,
    getPayouts,
    approvePayout
};
