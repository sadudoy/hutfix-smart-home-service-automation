const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/favorites.controller');
const { requireAuth } = require('../middleware/auth');

router.use(requireAuth);

router.post('/toggle', ctrl.toggleFavorite);
router.get('/mine', ctrl.getMine);

module.exports = router;
