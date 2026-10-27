const { pool } = require('../config/db');

async function list(req, res, next) {
    try {
        const result = await pool.query(
            'SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC;',
            [req.user.id]
        );
        return res.status(200).json({
            ok: true,
            addresses: result.rows
        });
    } catch (err) {
        return next(err);
    }
}

async function create(req, res, next) {
    try {
        const { label = 'Home', address_line, is_default = false } = req.body || {};
        if (!address_line || !address_line.trim()) {
            return res.status(400).json({ ok: false, error: 'address_line is required' });
        }

        const isDef = Boolean(is_default);
        if (isDef) {
            await pool.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1;', [req.user.id]);
        }

        const result = await pool.query(
            `INSERT INTO addresses (user_id, label, address_line, is_default)
             VALUES ($1, $2, $3, $4)
             RETURNING *;`,
            [req.user.id, label.trim() || 'Home', address_line.trim(), isDef]
        );

        return res.status(200).json({
            ok: true,
            address: result.rows[0]
        });
    } catch (err) {
        return next(err);
    }
}

async function update(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ ok: false, error: 'invalid address id' });
        }

        const existingRes = await pool.query(
            'SELECT * FROM addresses WHERE id = $1 AND user_id = $2;',
            [id, req.user.id]
        );
        if (existingRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Address not found' });
        }
        const existing = existingRes.rows[0];

        const { label, address_line, is_default } = req.body || {};
        const isDef = is_default !== undefined ? Boolean(is_default) : existing.is_default;

        if (isDef) {
            await pool.query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1;', [req.user.id]);
        }

        const newLabel = label !== undefined ? String(label).trim() : existing.label;
        const newLine = address_line !== undefined ? String(address_line).trim() : existing.address_line;

        const updateRes = await pool.query(
            `UPDATE addresses
             SET label = $1, address_line = $2, is_default = $3
             WHERE id = $4 AND user_id = $5
             RETURNING *;`,
            [newLabel, newLine, isDef, id, req.user.id]
        );

        return res.status(200).json({
            ok: true,
            address: updateRes.rows[0]
        });
    } catch (err) {
        return next(err);
    }
}

async function remove(req, res, next) {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) {
            return res.status(400).json({ ok: false, error: 'invalid address id' });
        }

        const delRes = await pool.query(
            'DELETE FROM addresses WHERE id = $1 AND user_id = $2 RETURNING id;',
            [id, req.user.id]
        );
        if (delRes.rows.length === 0) {
            return res.status(404).json({ ok: false, error: 'Address not found' });
        }

        return res.status(200).json({
            ok: true
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    list,
    create,
    update,
    remove
};
