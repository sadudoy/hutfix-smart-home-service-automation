const router = require('express').Router();
const ctrl = require('../controllers/requests.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/requests', requireAuth, requireRole('provider'), ctrl.providerRequests);
router.get('/settings', requireAuth, requireRole('provider'), ctrl.getProviderSettings);
router.patch('/settings', requireAuth, requireRole('provider'), ctrl.updateProviderSettings);

module.exports = router;

