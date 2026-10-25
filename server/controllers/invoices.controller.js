const { pool } = require('../config/db');

async function getByRequest(req, res, next) {
    try {
        const requestId = parseInt(req.params.requestId, 10);
        if (isNaN(requestId)) {
            return res.status(400).json({ ok: false, error: 'invalid request id' });
        }

        const query = `
            SELECT i.*, sr.customer_id, sr.assigned_provider_id, sc.name AS category_name,
                   cu.full_name AS customer_name, cu.phone AS customer_phone,
                   pu.full_name AS provider_name, pu.phone AS provider_phone,
                   p.address AS provider_address
            FROM invoices i
            JOIN service_requests sr ON sr.id = i.request_id
            JOIN service_categories sc ON sc.id = sr.category_id
            JOIN users cu ON cu.id = sr.customer_id
            JOIN providers p ON p.id = i.provider_id
            JOIN users pu ON pu.id = p.user_id
            WHERE i.request_id = $1;
        `;
        const result = await pool.query(query, [requestId]);
        if (result.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'invoice not found' });
        }

        const invoice = result.rows[0];

        // Access check: customer owns / provider assigned / admin
        if (req.user.role === 'customer') {
            if (Number(invoice.customer_id) !== Number(req.user.id)) {
                return res.status(403).json({ ok: false, error: 'forbidden' });
            }
        } else if (req.user.role === 'provider') {
            const provCheck = await pool.query(
                'SELECT id FROM providers WHERE id = $1 AND user_id = $2;',
                [invoice.assigned_provider_id, req.user.id]
            );
            if (provCheck.rows.length === 0) {
                return res.status(403).json({ ok: false, error: 'forbidden' });
            }
        } else if (req.user.role !== 'admin') {
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }

        return res.status(200).json({
            ok: true,
            invoice
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    getByRequest
};
