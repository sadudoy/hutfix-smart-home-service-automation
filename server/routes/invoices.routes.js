const router = require('express').Router();
const ctrl = require('../controllers/invoices.controller');
const { requireAuth } = require('../middleware/auth');

router.get('/by-request/:requestId', requireAuth, ctrl.getByRequest);

module.exports = router;
