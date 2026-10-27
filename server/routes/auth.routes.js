const express = require('express');
const rateLimit = require('express-rate-limit');
const ctrl = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });

router.post('/register', limiter, ctrl.register);
router.post('/login', limiter, ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/me', requireAuth, ctrl.me);
router.patch('/profile', requireAuth, ctrl.updateProfile);

module.exports = router;
