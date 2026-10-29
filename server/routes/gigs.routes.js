const express = require('express');
const ctrl = require('../controllers/gigs.controller');

const router = express.Router();

router.get('/:id/reviews', ctrl.getGigReviews);
router.get('/:id', ctrl.getGigDetails);

module.exports = router;
