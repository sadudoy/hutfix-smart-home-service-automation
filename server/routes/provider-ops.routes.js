const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/provider-ops.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('provider'));

router.get('/availability', ctrl.getAvailability);
router.put('/availability', ctrl.updateAvailability);

router.get('/blackouts', ctrl.getBlackouts);
router.post('/blackouts', ctrl.createBlackout);
router.delete('/blackouts/:id', ctrl.removeBlackout);

router.get('/payouts', ctrl.getPayouts);
router.post('/payouts', ctrl.createPayout);

router.post('/upload-media', ctrl.uploadMediaMiddleware, ctrl.uploadMedia);

module.exports = router;
