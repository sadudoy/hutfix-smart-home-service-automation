const { pool } = require('../config/db');
const matchingService = require('../services/matching.service');
const scheduling = require('../services/scheduling.service');
const lifecycle = require('../services/lifecycle.service');

async function match(req, res, next) {
    try {
        const {
            category_slug,
            preferred_date,
            preferred_start_minute,
            preferred_end_minute,
            urgency,
            address,
            latitude,
            longitude
        } = req.body || {};

        if (!category_slug || !preferred_date || preferred_start_minute == null || preferred_end_minute == null || !address) {
            return res.status(400).json({
                ok: false,
                error: 'category_slug, preferred_date, preferred_start_minute, preferred_end_minute, and address are required'
            });
        }

        const startMin = parseInt(preferred_start_minute, 10);
        const endMin = parseInt(preferred_end_minute, 10);

        if (isNaN(startMin) || isNaN(endMin) || startMin >= endMin) {
            return res.status(400).json({
                ok: false,
                error: 'preferred_start_minute must be strictly less than preferred_end_minute'
            });
        }

        const candidates = await matchingService.matchProviders({
            category_slug,
            preferred_date,
            preferred_start_minute: startMin,
            preferred_end_minute: endMin,
            urgency: urgency || 'normal',
            latitude,
            longitude
        });

        return res.status(200).json({
            ok: true,
            candidates
        });
    } catch (err) {
        if (err.status === 404 || err.message === 'category not found') {
            return res.status(404).json({ ok: false, error: 'category not found' });
        }
        return next(err);
    }
}

async function create(req, res, next) {
    const {
        category_slug,
        preferred_date,
        preferred_start_minute,
        preferred_end_minute,
        urgency,
        address,
        latitude,
        longitude,
        description,
        contact_phone,
        provider_id
    } = req.body || {};

    if (!category_slug || !preferred_date || preferred_start_minute == null || preferred_end_minute == null || !address) {
        return res.status(400).json({
            ok: false,
            error: 'category_slug, preferred_date, preferred_start_minute, preferred_end_minute, and address are required'
        });
    }

    const startMin = parseInt(preferred_start_minute, 10);
    const endMin = parseInt(preferred_end_minute, 10);

    if (isNaN(startMin) || isNaN(endMin) || startMin >= endMin) {
        return res.status(400).json({
            ok: false,
            error: 'preferred_start_minute must be strictly less than preferred_end_minute'
        });
    }

    // Lookup category_id from category_slug
    let category_id;
    try {
        const catRes = await pool.query('SELECT id FROM service_categories WHERE slug = $1;', [category_slug]);
        if (catRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'category not found' });
        }
        category_id = catRes.rows[0].id;
    } catch (err) {
        return next(err);
    }

    const weekday = new Date(preferred_date + 'T00:00:00Z').getUTCDay();
    let estimatedPrice = null;

    if (provider_id) {
        try {
            const checkQuery = `
                SELECT ps.price
                FROM providers p
                JOIN provider_services ps ON ps.provider_id = p.id
                WHERE p.id = $1
                  AND p.is_active = TRUE
                  AND ps.category_id = $2
                  AND EXISTS (
                    SELECT 1 FROM provider_availability pa
                    WHERE pa.provider_id = p.id
                      AND pa.weekday = $3
                      AND pa.start_minute <= $4
                      AND pa.end_minute >= $5
                  );
            `;
            const checkRes = await pool.query(checkQuery, [
                parseInt(provider_id, 10),
                category_id,
                weekday,
                startMin,
                endMin
            ]);

            if (checkRes.rows.length === 0) {
                return res.status(400).json({
                    ok: false,
                    error: 'provider not available for this slot'
                });
            }
            estimatedPrice = checkRes.rows[0].price;
        } catch (err) {
            return next(err);
        }
    }

    // Execute atomic creation transaction with advisory concurrency lock
    const client = await pool.connect();
    let inTransaction = false;
    let clientReleased = false;

    try {
        await client.query('BEGIN');
        inTransaction = true;

        if (provider_id) {
            // Advisory lock before checking or writing
            const lockKey = `booking:${provider_id}:${preferred_date}:${startMin}`;
            await client.query('SELECT pg_advisory_xact_lock(hashtext($1::text)) AS _lock;', [lockKey]);

            // Re-check slot availability inside the lock
            const slotCheck = await client.query(`
                SELECT 1 FROM provider_bookings
                WHERE provider_id = $1 AND slot_date = $2 AND start_minute = $3;
            `, [parseInt(provider_id, 10), preferred_date, startMin]);

            if (slotCheck.rows.length > 0) {
                await client.query('ROLLBACK');
                inTransaction = false;
                client.release();
                clientReleased = true;

                const suggestions = await scheduling.getSuggestions(
                    parseInt(provider_id, 10),
                    preferred_date,
                    category_slug,
                    startMin,
                    3
                );

                return res.status(409).json({
                    ok: false,
                    error: 'slot already booked',
                    suggestions
                });
            }
        }

        const imageUrl = req.file ? `/uploads/requests/${req.file.filename}` : null;

        const insertReqQuery = `
            INSERT INTO service_requests (
                customer_id, category_id, assigned_provider_id, description,
                urgency, address, latitude, longitude, preferred_date,
                preferred_start_minute, preferred_end_minute, contact_phone,
                image_url, status, estimated_price
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'requested', $14)
            RETURNING *;
        `;

        const reqRes = await client.query(insertReqQuery, [
            req.user.id,
            category_id,
            provider_id ? parseInt(provider_id, 10) : null,
            description || null,
            urgency || 'normal',
            address,
            latitude ? parseFloat(latitude) : null,
            longitude ? parseFloat(longitude) : null,
            preferred_date,
            startMin,
            endMin,
            contact_phone || null,
            imageUrl,
            estimatedPrice
        ]);

        const newRequest = reqRes.rows[0];

        if (provider_id) {
            const insertBookingQuery = `
                INSERT INTO provider_bookings (
                    provider_id, request_id, slot_date, start_minute, end_minute
                ) VALUES ($1, $2, $3, $4, $5);
            `;
            await client.query(insertBookingQuery, [
                parseInt(provider_id, 10),
                newRequest.id,
                preferred_date,
                startMin,
                endMin
            ]);
        }

        const insertEventQuery = `
            INSERT INTO request_status_events (request_id, status, note, created_by_user_id)
            VALUES ($1, 'requested', 'Request submitted', $2);
        `;
        await client.query(insertEventQuery, [newRequest.id, req.user.id]);

        await client.query('COMMIT');
        inTransaction = false;

        return res.status(200).json({
            ok: true,
            request: newRequest
        });
    } catch (err) {
        if (inTransaction) {
            await client.query('ROLLBACK').catch(() => {});
            inTransaction = false;
        }

        if (err.code === '23505') {
            let suggestions = [];
            if (provider_id) {
                try {
                    suggestions = await scheduling.getSuggestions(
                        parseInt(provider_id, 10),
                        preferred_date,
                        category_slug,
                        startMin,
                        3
                    );
                } catch (_) {}
            }
            return res.status(409).json({
                ok: false,
                error: 'slot already booked, please choose another provider/time',
                suggestions
            });
        }
        return next(err);
    } finally {
        if (!clientReleased) {
            client.release();
        }
    }
}

async function mine(req, res, next) {
    try {
        let query;
        let params = [];

        if (req.user.role === 'customer') {
            query = 'SELECT * FROM service_requests WHERE customer_id = $1 ORDER BY created_at DESC;';
            params = [req.user.id];
        } else if (req.user.role === 'provider') {
            query = `
                SELECT sr.*
                FROM service_requests sr
                JOIN providers p ON p.id = sr.assigned_provider_id
                WHERE p.user_id = $1
                ORDER BY sr.created_at DESC;
            `;
            params = [req.user.id];
        } else {
            // Admin
            query = 'SELECT * FROM service_requests ORDER BY created_at DESC;';
        }

        const result = await pool.query(query, params);
        return res.status(200).json({
            ok: true,
            requests: result.rows
        });
    } catch (err) {
        return next(err);
    }
}

async function getOne(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ ok: false, error: 'invalid request id' });
        }

        const reqQuery = `
            SELECT sr.*, sc.slug AS category_slug, sc.name AS category_name, sc.icon AS category_icon,
                   u.full_name AS provider_name, u.phone AS provider_phone,
                   p.headline AS provider_headline, p.rating AS provider_rating,
                   p.rating_count AS provider_rating_count, p.address AS provider_address
            FROM service_requests sr
            JOIN service_categories sc ON sc.id = sr.category_id
            LEFT JOIN providers p ON p.id = sr.assigned_provider_id
            LEFT JOIN users u ON u.id = p.user_id
            WHERE sr.id = $1;
        `;
        const result = await pool.query(reqQuery, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'request not found' });
        }

        const request = result.rows[0];

        // Access check
        if (req.user.role === 'customer') {
            if (Number(request.customer_id) !== Number(req.user.id)) {
                return res.status(403).json({ ok: false, error: 'forbidden' });
            }
        } else if (req.user.role === 'provider') {
            if (!request.assigned_provider_id) {
                return res.status(403).json({ ok: false, error: 'forbidden' });
            }
            const provCheck = await pool.query(
                'SELECT id FROM providers WHERE id = $1 AND user_id = $2;',
                [request.assigned_provider_id, req.user.id]
            );
            if (provCheck.rows.length === 0) {
                return res.status(403).json({ ok: false, error: 'forbidden' });
            }
        } else if (req.user.role !== 'admin') {
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }

        // Query events
        const eventsRes = await pool.query(
            'SELECT id, status, note, created_at FROM request_status_events WHERE request_id = $1 ORDER BY created_at ASC, id ASC;',
            [id]
        );

        return res.status(200).json({
            ok: true,
            request,
            events: eventsRes.rows
        });
    } catch (err) {
        return next(err);
    }
}

async function customerCancel(req, res, next) {
    const client = await pool.connect();
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            client.release();
            return res.status(400).json({ ok: false, error: 'invalid request id' });
        }

        const checkRes = await client.query('SELECT * FROM service_requests WHERE id = $1;', [id]);
        if (checkRes.rows.length === 0) {
            client.release();
            return res.status(404).json({ ok: false, error: 'request not found' });
        }

        const existing = checkRes.rows[0];
        if (Number(existing.customer_id) !== Number(req.user.id)) {
            client.release();
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }

        if (existing.status !== 'requested' && existing.status !== 'accepted') {
            client.release();
            return res.status(400).json({ ok: false, error: 'cannot cancel request in current status' });
        }

        await client.query('BEGIN');
        const updateRes = await client.query(
            "UPDATE service_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1 RETURNING *;",
            [id]
        );
        await client.query('DELETE FROM provider_bookings WHERE request_id = $1;', [id]);
        await client.query(
            "INSERT INTO request_status_events (request_id, status, note, created_by_user_id) VALUES ($1, 'cancelled', 'Cancelled by customer', $2);",
            [id, req.user.id]
        );
        await client.query('COMMIT');
        client.release();

        return res.status(200).json({
            ok: true,
            request: updateRes.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
        return next(err);
    }
}

async function acceptRequest(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ ok: false, error: 'invalid request id' });
        }

        const checkRes = await pool.query('SELECT * FROM service_requests WHERE id = $1;', [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'request not found' });
        }

        const existing = checkRes.rows[0];
        if (!existing.assigned_provider_id) {
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }

        const provCheck = await pool.query(
            'SELECT id FROM providers WHERE id = $1 AND user_id = $2;',
            [existing.assigned_provider_id, req.user.id]
        );
        if (provCheck.rows.length === 0) {
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }

        if (existing.status !== 'requested') {
            return res.status(409).json({ ok: false, error: 'already handled' });
        }

        const updateRes = await pool.query(
            "UPDATE service_requests SET status = 'accepted', updated_at = NOW() WHERE id = $1 AND status = 'requested' RETURNING *;",
            [id]
        );

        if (updateRes.rows.length === 0) {
            return res.status(409).json({ ok: false, error: 'already handled' });
        }

        await pool.query(
            "INSERT INTO request_status_events (request_id, status, note, created_by_user_id) VALUES ($1, 'accepted', 'Accepted by provider', $2);",
            [id, req.user.id]
        );

        return res.status(200).json({
            ok: true,
            request: updateRes.rows[0]
        });
    } catch (err) {
        return next(err);
    }
}

async function rejectRequest(req, res, next) {
    const client = await pool.connect();
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            client.release();
            return res.status(400).json({ ok: false, error: 'invalid request id' });
        }

        const checkRes = await client.query('SELECT * FROM service_requests WHERE id = $1;', [id]);
        if (checkRes.rows.length === 0) {
            client.release();
            return res.status(404).json({ ok: false, error: 'request not found' });
        }

        const existing = checkRes.rows[0];
        if (!existing.assigned_provider_id) {
            client.release();
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }

        const provCheck = await client.query(
            'SELECT id FROM providers WHERE id = $1 AND user_id = $2;',
            [existing.assigned_provider_id, req.user.id]
        );
        if (provCheck.rows.length === 0) {
            client.release();
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }

        if (existing.status !== 'requested') {
            client.release();
            return res.status(409).json({ ok: false, error: 'already handled' });
        }

        await client.query('BEGIN');
        const updateRes = await client.query(
            "UPDATE service_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND status = 'requested' RETURNING *;",
            [id]
        );

        if (updateRes.rows.length === 0) {
            await client.query('ROLLBACK');
            client.release();
            return res.status(409).json({ ok: false, error: 'already handled' });
        }

        await client.query('DELETE FROM provider_bookings WHERE request_id = $1;', [id]);
        await client.query(
            "INSERT INTO request_status_events (request_id, status, note, created_by_user_id) VALUES ($1, 'cancelled', 'Rejected by provider', $2);",
            [id, req.user.id]
        );
        await client.query('COMMIT');
        client.release();

        return res.status(200).json({
            ok: true,
            request: updateRes.rows[0]
        });
    } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        client.release();
        return next(err);
    }
}

async function updateStatus(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        const { status } = req.body || {};

        if (isNaN(id) || !['on_the_way', 'in_progress', 'completed'].includes(status)) {
            return res.status(400).json({ ok: false, error: 'invalid status' });
        }

        const checkRes = await pool.query('SELECT * FROM service_requests WHERE id = $1;', [id]);
        if (checkRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'request not found' });
        }

        const existing = checkRes.rows[0];

        // Provider ownership check
        if (req.user.role === 'provider') {
            if (!existing.assigned_provider_id) {
                return res.status(403).json({ ok: false, error: 'forbidden' });
            }
            const provCheck = await pool.query(
                'SELECT id FROM providers WHERE id = $1 AND user_id = $2;',
                [existing.assigned_provider_id, req.user.id]
            );
            if (provCheck.rows.length === 0) {
                return res.status(403).json({ ok: false, error: 'forbidden' });
            }
        }

        // Validate state machine transition
        if (!lifecycle.canTransition(existing.status, status)) {
            return res.status(400).json({
                ok: false,
                error: `invalid transition from ${existing.status} to ${status}`
            });
        }

        const updateRes = await pool.query(
            'UPDATE service_requests SET status = $2, updated_at = NOW() WHERE id = $1 AND status = $3 RETURNING *;',
            [id, status, existing.status]
        );

        if (updateRes.rows.length === 0) {
            return res.status(409).json({ ok: false, error: 'status changed concurrently' });
        }

        await pool.query(
            'INSERT INTO request_status_events (request_id, status, note, created_by_user_id) VALUES ($1, $2, $3, $4);',
            [id, status, `Status advanced to ${status}`, req.user.id]
        );

        return res.status(200).json({
            ok: true,
            request: updateRes.rows[0]
        });
    } catch (err) {
        return next(err);
    }
}

async function providerRequests(req, res, next) {
    try {
        let bucket = req.query.bucket || 'incoming';
        if (!['incoming', 'active', 'history'].includes(bucket)) {
            bucket = 'incoming';
        }

        let statusFilter;
        if (bucket === 'incoming') {
            statusFilter = ['requested'];
        } else if (bucket === 'active') {
            statusFilter = ['accepted', 'on_the_way', 'in_progress'];
        } else {
            statusFilter = ['completed', 'cancelled'];
        }

        const query = `
            SELECT sr.*, sc.slug AS category_slug, sc.name AS category_name, sc.icon AS category_icon,
                   cu.full_name AS customer_name, cu.phone AS customer_phone
            FROM service_requests sr
            JOIN service_categories sc ON sc.id = sr.category_id
            JOIN users cu ON cu.id = sr.customer_id
            JOIN providers p ON p.id = sr.assigned_provider_id
            WHERE p.user_id = $1 AND sr.status = ANY($2::text[])
            ORDER BY sr.created_at DESC;
        `;
        const result = await pool.query(query, [req.user.id, statusFilter]);

        return res.status(200).json({
            ok: true,
            bucket,
            requests: result.rows
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    match,
    create,
    mine,
    getOne,
    customerCancel,
    acceptRequest,
    rejectRequest,
    updateStatus,
    providerRequests
};
