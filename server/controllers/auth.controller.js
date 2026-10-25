const jwt = require('jsonwebtoken');
const { pool } = require('../config/db');
const { JWT_SECRET, NODE_ENV } = require('../config/env');

const TOKEN_NAME = 'hutfix_token';
const TOKEN_OPTS = {
    httpOnly: true,
    sameSite: 'lax',
    secure: NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 3600 * 1000
};

function generateToken(user) {
    return jwt.sign(
        { sub: String(user.id), role: user.role, email: user.email },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
}

async function register(req, res, next) {
    try {
        const { email, password, full_name, phone, role } = req.body || {};

        if (!email || !password || !full_name) {
            return res.status(400).json({
                ok: false,
                error: 'email, password, and full_name are required'
            });
        }

        if (typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({
                ok: false,
                error: 'password must be at least 6 characters long'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const assignedRole = role || 'customer';

        if (assignedRole === 'admin') {
            return res.status(400).json({
                ok: false,
                error: 'admins are seeded only'
            });
        }

        if (!['customer', 'provider'].includes(assignedRole)) {
            return res.status(400).json({
                ok: false,
                error: 'invalid role; must be customer or provider'
            });
        }

        // Check if user already exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1;', [normalizedEmail]);
        if (existing.rows.length > 0) {
            return res.status(409).json({
                ok: false,
                error: 'email already registered'
            });
        }

        // Insert new user with pgcrypto crypt() and gen_salt()
        const insertUserQuery = `
            INSERT INTO users (email, password_hash, full_name, phone, role)
            VALUES ($1, crypt($2, gen_salt('bf')), $3, $4, $5)
            RETURNING id, email, full_name, phone, role, created_at;
        `;
        const userRes = await pool.query(insertUserQuery, [
            normalizedEmail,
            password,
            full_name.trim(),
            phone ? phone.trim() : null,
            assignedRole
        ]);
        const user = userRes.rows[0];

        // If provider, create corresponding provider profile
        if (assignedRole === 'provider') {
            const headline = `Service provider — ${user.full_name}`;
            await pool.query(
                `INSERT INTO providers (user_id, headline, is_active)
                 VALUES ($1, $2, TRUE)
                 ON CONFLICT (user_id) DO NOTHING;`,
                [user.id, headline]
            );
        }

        const token = generateToken(user);
        res.cookie(TOKEN_NAME, token, TOKEN_OPTS);

        return res.status(200).json({
            ok: true,
            user
        });
    } catch (err) {
        return next(err);
    }
}

async function login(req, res, next) {
    try {
        const { email, password } = req.body || {};

        if (!email || !password) {
            return res.status(400).json({
                ok: false,
                error: 'email and password are required'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Query with pgcrypto crypt verification
        const query = `
            SELECT id, email, full_name, phone, role, created_at
            FROM users
            WHERE email = $1 AND password_hash = crypt($2, password_hash);
        `;
        const result = await pool.query(query, [normalizedEmail, password]);

        if (result.rows.length === 0) {
            return res.status(401).json({
                ok: false,
                error: 'invalid credentials'
            });
        }

        const user = result.rows[0];
        const token = generateToken(user);
        res.cookie(TOKEN_NAME, token, TOKEN_OPTS);

        return res.status(200).json({
            ok: true,
            user
        });
    } catch (err) {
        return next(err);
    }
}

function logout(req, res) {
    res.clearCookie(TOKEN_NAME, { path: '/' });
    return res.status(200).json({ ok: true });
}

async function me(req, res, next) {
    try {
        const query = `
            SELECT id, email, full_name, phone, role, created_at
            FROM users
            WHERE id = $1;
        `;
        const result = await pool.query(query, [req.user.id]);

        if (result.rows.length === 0) {
            return res.status(404).json({
                ok: false,
                error: 'user not found'
            });
        }

        return res.status(200).json({
            ok: true,
            user: result.rows[0]
        });
    } catch (err) {
        return next(err);
    }
}

module.exports = {
    TOKEN_NAME,
    TOKEN_OPTS,
    register,
    login,
    logout,
    me
};
