const express = require('express');
const ctrl = require('../controllers/gigs.controller');

const router = express.Router();

router.get('/:providerId', ctrl.getGigDetails);

module.exports = router;
