const { pool } = require('../config/db');
const matchingService = require('../services/matching.service');
const scheduling = require('../services/scheduling.service');

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

module.exports = {
    match,
    create,
    mine
};
