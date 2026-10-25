const router = require('express').Router();
const ctrl = require('../controllers/notifications.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/', requireAuth, ctrl.list);
router.post('/read', requireAuth, ctrl.markRead);
router.post('/read-all', requireAuth, ctrl.markAllRead);

module.exports = router;
