const { pool } = require('../config/db');
const { notify } = require('../services/notifications.service');

async function create(req, res, next) {
    const client = await pool.connect();
    try {
        const requestId = parseInt(req.params.requestId, 10);
        if (isNaN(requestId)) {
            client.release();
            return res.status(400).json({ ok: false, error: 'invalid request id' });
        }

        const { stars, comment } = req.body || {};
        const starsNum = parseInt(stars, 10);
        if (isNaN(starsNum) || starsNum < 1 || starsNum > 5) {
            client.release();
            return res.status(400).json({ ok: false, error: 'stars must be an integer between 1 and 5' });
        }

        const safeComment = comment ? String(comment).trim().slice(0, 500) : null;

        const reqCheck = await client.query('SELECT * FROM service_requests WHERE id = $1;', [requestId]);
        if (reqCheck.rows.length === 0) {
            client.release();
            return res.status(404).json({ ok: false, error: 'request not found' });
        }

        const request = reqCheck.rows[0];

        if (Number(request.customer_id) !== Number(req.user.id)) {
            client.release();
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }

        if (request.status !== 'completed') {
            client.release();
            return res.status(400).json({ ok: false, error: 'can only rate completed requests' });
        }

        if (!request.assigned_provider_id) {
            client.release();
            return res.status(400).json({ ok: false, error: 'provider assigned required' });
        }

        await client.query('BEGIN');

        const insertRes = await client.query(`
            INSERT INTO ratings (request_id, customer_id, provider_id, stars, comment)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (request_id) DO NOTHING
            RETURNING *;
        `, [requestId, req.user.id, request.assigned_provider_id, starsNum, safeComment]);

        if (insertRes.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(409).json({ ok: false, error: 'already rated' });
        }

        const rating = insertRes.rows[0];

        // Recompute provider aggregate
        const aggRes = await client.query(`
            UPDATE providers SET
              rating = CASE 
                WHEN rating_count = 0 THEN $2::numeric
                ELSE ROUND((((rating * rating_count) + $2::numeric) / (rating_count + 1))::numeric, 1)
              END,
              rating_count = rating_count + 1
            WHERE id = $1
            RETURNING rating, rating_count;
        `, [request.assigned_provider_id, starsNum]);

        const updatedProvider = aggRes.rows[0];

        // Get customer name for notification
        const custRes = await client.query('SELECT full_name FROM users WHERE id = $1;', [req.user.id]);
        const customerName = custRes.rows[0]?.full_name || 'Customer';

        // Get provider user_id
        const provRes = await client.query('SELECT user_id FROM providers WHERE id = $1;', [request.assigned_provider_id]);
        const providerUserId = provRes.rows[0]?.user_id;

        if (providerUserId) {
            await notify(client, {
                userId: providerUserId,
                requestId,
                kind: 'review_received',
                title: 'New review',
                body: ` stars from ${customerName}`
            });
        }

        await client.query('COMMIT');
        client.release();

        return res.status(200).json({
            ok: true,
            rating,
            provider_rating: updatedProvider ? Number(updatedProvider.rating) : null,
            provider_rating_count: updatedProvider ? parseInt(updatedProvider.rating_count, 10) : 0
        });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
        return next(err);
    }
}

module.exports = {
    create
};
