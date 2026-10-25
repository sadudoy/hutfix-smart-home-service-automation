const express = require('express');
const router = express.Router();
const scheduling = require('../services/scheduling.service');

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
