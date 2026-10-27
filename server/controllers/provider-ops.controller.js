const { pool } = require('../config/db');

async function getProviderId(userId) {
    const res = await pool.query('SELECT id FROM providers WHERE user_id = $1;', [userId]);
    return res.rows.length > 0 ? res.rows[0].id : null;
}

async function getAvailability(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const result = await pool.query(
            'SELECT id, weekday, start_minute, end_minute FROM provider_availability WHERE provider_id = $1 ORDER BY weekday ASC, start_minute ASC;',
            [providerId]
        );
        return res.status(200).json({ ok: true, availability: result.rows });
    } catch (err) {
        return next(err);
    }
}

async function updateAvailability(req, res, next) {
    const client = await pool.connect();
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) {
            client.release();
            return res.status(404).json({ ok: false, error: 'provider not found' });
        }

        const items = Array.isArray(req.body) ? req.body : (req.body?.availability || []);

        await client.query('BEGIN');
        await client.query('DELETE FROM provider_availability WHERE provider_id = $1;', [providerId]);

        for (const item of items) {
            const weekday = parseInt(item.weekday, 10);
            const startMin = parseInt(item.start_minute, 10);
            const endMin = parseInt(item.end_minute, 10);
            if (!isNaN(weekday) && !isNaN(startMin) && !isNaN(endMin) && startMin < endMin) {
                await client.query(
                    'INSERT INTO provider_availability (provider_id, weekday, start_minute, end_minute) VALUES ($1, $2, $3, $4);',
                    [providerId, weekday, startMin, endMin]
                );
            }
        }

        await client.query('COMMIT');
        client.release();

        return res.status(200).json({ ok: true, message: 'Availability updated', count: items.length });
    } catch (err) {
        await client.query('ROLLBACK');
        client.release();
        return next(err);
    }
}

async function getBlackouts(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const result = await pool.query(
            'SELECT id, blackout_date, reason, created_at FROM provider_blackouts WHERE provider_id = $1 ORDER BY blackout_date ASC;',
            [providerId]
        );
        return res.status(200).json({ ok: true, blackouts: result.rows });
    } catch (err) {
        return next(err);
    }
}

async function createBlackout(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const { blackout_date, reason } = req.body || {};
        if (!blackout_date) {
            return res.status(400).json({ ok: false, error: 'blackout_date is required' });
        }

        const result = await pool.query(
            `INSERT INTO provider_blackouts (provider_id, blackout_date, reason)
             VALUES ($1, $2, $3)
             ON CONFLICT (provider_id, blackout_date) DO UPDATE SET reason = EXCLUDED.reason
             RETURNING *;`,
            [providerId, blackout_date, reason || null]
        );

        return res.status(200).json({ ok: true, blackout: result.rows[0] });
    } catch (err) {
        return next(err);
    }
}

async function removeBlackout(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ ok: false, error: 'invalid blackout id' });

        const delRes = await pool.query(
            'DELETE FROM provider_blackouts WHERE id = $1 AND provider_id = $2 RETURNING id;',
            [id, providerId]
        );
        if (delRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'blackout not found' });
        }

        return res.status(200).json({ ok: true });
    } catch (err) {
        return next(err);
    }
}

async function getPayouts(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const result = await pool.query(
            'SELECT * FROM payout_requests WHERE provider_id = $1 ORDER BY created_at DESC;',
            [providerId]
        );

        const earnedRes = await pool.query(
            'SELECT COALESCE(SUM(subtotal), 0)::numeric AS total_earned FROM invoices WHERE provider_id = $1;',
            [providerId]
        );
        const paidRes = await pool.query(
            "SELECT COALESCE(SUM(amount), 0)::numeric AS total_paid FROM payout_requests WHERE provider_id = $1 AND status IN ('completed', 'pending');",
            [providerId]
        );

        const totalEarned = parseFloat(earnedRes.rows[0].total_earned);
        const totalPaid = parseFloat(paidRes.rows[0].total_paid);
        const availableBalance = Math.max(0, totalEarned - totalPaid);

        return res.status(200).json({
            ok: true,
            payouts: result.rows,
            total_earned: totalEarned,
            available_balance: availableBalance
        });
    } catch (err) {
        return next(err);
    }
}

async function createPayout(req, res, next) {
    try {
        const providerId = await getProviderId(req.user.id);
        if (!providerId) return res.status(404).json({ ok: false, error: 'provider not found' });

        const { amount } = req.body || {};
        const amt = parseFloat(amount);
        if (isNaN(amt) || amt <= 0) {
            return res.status(400).json({ ok: false, error: 'valid positive amount is required' });
        }

        // Calculate available balance from invoices and existing payouts
        const earnedRes = await pool.query(
            'SELECT COALESCE(SUM(subtotal), 0)::numeric AS total_earned FROM invoices WHERE provider_id = $1;',
            [providerId]
        );
        const paidRes = await pool.query(
            "SELECT COALESCE(SUM(amount), 0)::numeric AS total_paid FROM payout_requests WHERE provider_id = $1 AND status IN ('completed', 'pending');",
            [providerId]
        );

        const totalEarned = parseFloat(earnedRes.rows[0].total_earned);
        const totalPaid = parseFloat(paidRes.rows[0].total_paid);
        const availableBalance = Math.max(0, totalEarned - totalPaid);

        if (totalEarned > 0 && amt > availableBalance) {
            return res.status(400).json({
                ok: false,
                error: 'Requested amount exceeds available balance',
                available_balance: availableBalance
            });
        }

        const insertRes = await pool.query(
            "INSERT INTO payout_requests (provider_id, amount, status) VALUES ($1, $2, 'pending') RETURNING *;",
            [providerId, amt]
        );

        return res.status(200).json({
            ok: true,
            payout: insertRes.rows[0],
            available_balance: availableBalance - amt
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getAvailability,
    updateAvailability,
    getBlackouts,
    createBlackout,
    removeBlackout,
    getPayouts,
    createPayout
};
