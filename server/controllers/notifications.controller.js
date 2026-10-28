const { pool } = require('../config/db');

async function list(req, res, next) {
    try {
        const notifQuery = `
            SELECT id, kind, title, body, is_read, request_id, link, created_at
            FROM notifications
            WHERE user_id = $1
            ORDER BY created_at DESC
            LIMIT 50;
        `;
        const countQuery = `
            SELECT COUNT(*)::int AS unread_count
            FROM notifications
            WHERE user_id = $1 AND is_read = FALSE;
        `;

        const [notifRes, countRes] = await Promise.all([
            pool.query(notifQuery, [req.user.id]),
            pool.query(countQuery, [req.user.id])
        ]);

        return res.status(200).json({
            ok: true,
            notifications: notifRes.rows,
            unread_count: countRes.rows[0]?.unread_count || 0
        });
    } catch (err) {
        return next(err);
    }
}

async function markRead(req, res, next) {
    try {
        const { id } = req.body || {};
        const notifId = parseInt(id, 10);
        if (isNaN(notifId)) {
            return res.status(400).json({ ok: false, error: 'invalid notification id' });
        }

        const updateRes = await pool.query(`
            UPDATE notifications
            SET is_read = TRUE
            WHERE id = $1 AND user_id = $2
            RETURNING id;
        `, [notifId, req.user.id]);

        if (updateRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'notification not found' });
        }

        return res.status(200).json({
            ok: true,
            id: updateRes.rows[0].id
        });
    } catch (err) {
        return next(err);
    }
}

async function markAllRead(req, res, next) {
    try {
        const updateRes = await pool.query(`
            UPDATE notifications
            SET is_read = TRUE
            WHERE user_id = $1 AND is_read = FALSE
            RETURNING id;
        `, [req.user.id]);

        return res.status(200).json({
            ok: true,
            updated: updateRes.rows.length
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    list,
    markRead,
    markAllRead
};
