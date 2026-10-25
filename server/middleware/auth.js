const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');

function requireAuth(req, res, next) {
    let token = req.cookies && req.cookies.hutfix_token;
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
        return res.status(401).json({ ok: false, error: 'auth required' });
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.user = {
            id: Number(payload.sub),
            role: payload.role,
            email: payload.email
        };
        return next();
    } catch (err) {
        return res.status(401).json({ ok: false, error: 'invalid token' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ ok: false, error: 'auth required' });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ ok: false, error: 'forbidden' });
        }
        return next();
    };
}

module.exports = {
    requireAuth,
    requireRole
};
