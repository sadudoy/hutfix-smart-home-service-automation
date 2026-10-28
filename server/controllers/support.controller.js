const { pool } = require('../config/db');

async function createTicket(req, res, next) {
    try {
        const { subject, message } = req.body || {};
        if (!subject || !subject.trim() || !message || !message.trim()) {
            return res.status(400).json({ ok: false, error: 'subject and message are required' });
        }

        const result = await pool.query(
            `INSERT INTO support_tickets (user_id, subject, message, status)
             VALUES ($1, $2, $3, 'open')
             RETURNING *;`,
            [req.user.id, subject.trim(), message.trim()]
        );

        return res.status(201).json({
            ok: true,
            ticket: result.rows[0]
        });
    } catch (err) {
        return next(err);
    }
}

async function getMine(req, res, next) {
    try {
        const result = await pool.query(
            `SELECT * FROM support_tickets
             WHERE user_id = $1
             ORDER BY created_at DESC;`,
            [req.user.id]
        );

        return res.status(200).json({
            ok: true,
            tickets: result.rows
        });
    } catch (err) {
        return next(err);
    }
}

async function getAllForAdmin(req, res, next) {
    try {
        const result = await pool.query(
            `SELECT st.*, u.full_name, u.email, u.role
             FROM support_tickets st
             JOIN users u ON u.id = st.user_id
             ORDER BY st.created_at DESC;`
        );

        return res.status(200).json({
            ok: true,
            tickets: result.rows
        });
    } catch (err) {
        return next(err);
    }
}

async function updateStatus(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ ok: false, error: 'invalid ticket id' });
        }
        const { status } = req.body || {};
        const chosenStatus = status || 'resolved';

        if (!['open', 'resolved', 'closed'].includes(chosenStatus)) {
            return res.status(400).json({ ok: false, error: 'valid status (open|resolved|closed) required' });
        }

        const result = await pool.query(
            `UPDATE support_tickets
             SET status = $1
             WHERE id = $2
             RETURNING *;`,
            [chosenStatus, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'ticket not found' });
        }

        return res.status(200).json({
            ok: true,
            ticket: result.rows[0]
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    createTicket,
    getMine,
    getAllForAdmin,
    updateStatus
};
