const express = require('express');
const router = express.Router();
const { pool } = require('../config/db');
const scheduling = require('../services/scheduling.service');
const { requireAuth, requireRole } = require('../middleware/auth');
const providersCtrl = require('../controllers/providers.controller');

router.get('/:userId/profile', requireAuth, requireRole('provider', 'admin'), providersCtrl.getProviderProfileByUserId);

router.get('/search', providersCtrl.search);
router.get('/', providersCtrl.search);

router.get('/:id/slots', async (req, res, next) => {
    try {
        const { date, category_slug } = req.query;
        if (!date || !category_slug) {
            return res.status(400).json({ ok: false, error: 'date and category_slug required' });
        }
        const result = await scheduling.getSlots(Number(req.params.id), date, category_slug);
        res.json({ ok: true, ...result });
    } catch (e) {
        if (e.status === 404 || e.message === 'provider not found or does not serve category') {
            return res.status(404).json({ ok: false, error: 'provider not found or does not serve category' });
        }
        next(e);
    }
});

module.exports = router;
