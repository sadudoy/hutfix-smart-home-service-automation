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

        const ticket = result.rows[0];

        // Seed initial message into thread
        await pool.query(
            `INSERT INTO ticket_messages (ticket_id, sender_id, message)
             VALUES ($1, $2, $3);`,
            [ticket.id, req.user.id, message.trim()]
        );

        return res.status(201).json({
            ok: true,
            ticket
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

async function getTicketMessages(req, res, next) {
    try {
        const ticketId = parseInt(req.params.id, 10);
        if (isNaN(ticketId)) {
            return res.status(400).json({ ok: false, error: 'invalid ticket id' });
        }

        const ticketRes = await pool.query(
            `SELECT st.*, u.full_name AS user_name, u.email AS user_email, u.role AS user_role
             FROM support_tickets st
             JOIN users u ON u.id = st.user_id
             WHERE st.id = $1;`,
            [ticketId]
        );

        if (ticketRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'ticket not found' });
        }

        const ticket = ticketRes.rows[0];

        // Access check
        if (req.user.role !== 'admin' && Number(ticket.user_id) !== Number(req.user.id)) {
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }

        const messagesRes = await pool.query(
            `SELECT tm.id, tm.ticket_id, tm.sender_id, tm.message, tm.created_at,
                    u.full_name AS sender_name, u.email AS sender_email, u.role AS sender_role
             FROM ticket_messages tm
             JOIN users u ON u.id = tm.sender_id
             WHERE tm.ticket_id = $1
             ORDER BY tm.created_at ASC;`,
            [ticketId]
        );

        let messages = messagesRes.rows;

        // If no messages in table yet, provide initial message from support_tickets
        if (messages.length === 0 && ticket.message) {
            messages = [{
                id: 0,
                ticket_id: ticket.id,
                sender_id: ticket.user_id,
                sender_name: ticket.user_name,
                sender_email: ticket.user_email,
                sender_role: ticket.user_role,
                message: ticket.message,
                created_at: ticket.created_at
            }];
        }

        return res.status(200).json({
            ok: true,
            ticket,
            messages
        });
    } catch (err) {
        return next(err);
    }
}

async function addTicketMessage(req, res, next) {
    try {
        const ticketId = parseInt(req.params.id, 10);
        const { message } = req.body || {};

        if (isNaN(ticketId) || !message || !message.trim()) {
            return res.status(400).json({ ok: false, error: 'valid ticket id and non-empty message are required' });
        }

        const ticketRes = await pool.query('SELECT * FROM support_tickets WHERE id = $1;', [ticketId]);
        if (ticketRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'ticket not found' });
        }
        const ticket = ticketRes.rows[0];

        if (req.user.role !== 'admin' && Number(ticket.user_id) !== Number(req.user.id)) {
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }

        const insertRes = await pool.query(
            `INSERT INTO ticket_messages (ticket_id, sender_id, message)
             VALUES ($1, $2, $3)
             RETURNING id, ticket_id, sender_id, message, created_at;`,
            [ticketId, req.user.id, message.trim()]
        );

        const newMsg = insertRes.rows[0];
        newMsg.sender_name = req.user.full_name;
        newMsg.sender_role = req.user.role;
        newMsg.sender_email = req.user.email;

        // Auto reopen ticket if resolved/closed when user responds
        if (req.user.role !== 'admin' && (ticket.status === 'resolved' || ticket.status === 'closed')) {
            await pool.query("UPDATE support_tickets SET status = 'open' WHERE id = $1;", [ticketId]);
        }

        return res.status(201).json({
            ok: true,
            message: newMsg
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    createTicket,
    getMine,
    getAllForAdmin,
    updateStatus,
    getTicketMessages,
    addTicketMessage
};
