const router = require('express').Router();
const ctrl = require('../controllers/invoices.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/mine', requireAuth, requireRole('provider'), ctrl.getMine);
router.get('/by-request/:requestId', requireAuth, ctrl.getByRequest);

module.exports = router;
