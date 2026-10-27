const express = require('express');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/requests.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/match', requireAuth, requireRole('customer'), ctrl.match);
router.post('/', requireAuth, requireRole('customer'), upload.single('image'), ctrl.create);

// Express route ordering note: /mine MUST stay ABOVE /:id so 'mine' is not captured as an :id parameter
router.get('/mine', requireAuth, ctrl.mine);

router.post('/:id/cancel', requireAuth, requireRole('customer'), ctrl.customerCancel);
router.patch('/:id/reschedule', requireAuth, requireRole('customer'), ctrl.reschedule);
router.post('/:id/accept', requireAuth, requireRole('provider'), ctrl.acceptRequest);
router.post('/:id/reject', requireAuth, requireRole('provider'), ctrl.rejectRequest);
router.patch('/:id/status', requireAuth, requireRole('provider', 'admin'), ctrl.updateStatus);
router.get('/:id', requireAuth, ctrl.getOne);

module.exports = router;
