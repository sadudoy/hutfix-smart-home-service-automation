const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/stats', requireAuth, requireRole('admin'), ctrl.getStats);
router.get('/users', requireAuth, requireRole('admin'), ctrl.getUsers);
router.get('/bookings', requireAuth, requireRole('admin'), ctrl.getBookings);

module.exports = router;
