const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/support.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth);

router.post('/', ctrl.createTicket);
router.get('/mine', ctrl.getMine);
router.get('/:id/messages', ctrl.getTicketMessages);
router.post('/:id/messages', ctrl.addTicketMessage);

// Admin routes also accessible under /api/support/admin
router.get('/admin', requireRole('admin'), ctrl.getAllForAdmin);
router.patch('/admin/:id', requireRole('admin'), ctrl.updateStatus);

module.exports = router;
