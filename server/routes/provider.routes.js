const router = require('express').Router();
const ctrl = require('../controllers/requests.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/requests', requireAuth, requireRole('provider'), ctrl.providerRequests);

module.exports = router;

