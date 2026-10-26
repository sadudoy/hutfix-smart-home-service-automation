const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.get('/stats', requireAuth, requireRole('admin'), ctrl.getStats);

module.exports = router;
