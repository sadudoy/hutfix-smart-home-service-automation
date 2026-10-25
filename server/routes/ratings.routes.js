const router = require('express').Router();
const ctrl = require('../controllers/ratings.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.post('/by-request/:requestId', requireAuth, requireRole('customer'), ctrl.create);

module.exports = router;
