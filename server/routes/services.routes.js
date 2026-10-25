const router = require('express').Router();
const ctrl = require('../controllers/services.controller');

router.get('/', ctrl.list);
router.get('/:slug', ctrl.getBySlug);

module.exports = router;
