const express = require('express');
const upload = require('../middleware/upload');
const ctrl = require('../controllers/requests.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.post('/match', requireAuth, requireRole('customer'), ctrl.match);
router.post('/', requireAuth, requireRole('customer'), upload.single('image'), ctrl.create);
router.get('/mine', requireAuth, ctrl.mine);

module.exports = router;
