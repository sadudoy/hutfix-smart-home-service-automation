const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/admin.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

router.use(requireAuth, requireRole('admin'));

// Stats & Ledgers
router.get('/stats', ctrl.getStats);
router.get('/users', ctrl.getUsers);
router.get('/bookings', ctrl.getBookings);

// User/Provider Verification & Assignment
router.patch('/users/:id/verify', ctrl.toggleVerifyUser);
router.post('/bookings/:id/assign', ctrl.assignBooking);

// Disputes Moderation
router.get('/disputes', ctrl.getDisputes);
router.post('/disputes', ctrl.createDispute);
router.post('/disputes/:id/resolve', ctrl.resolveDispute);
router.patch('/disputes/:id', ctrl.resolveDispute);

// Manual Payment Verification
router.get('/payments', ctrl.getPayments);
router.patch('/payments/:id/verify', ctrl.verifyPayment);

// Payout Requests
router.get('/payouts', ctrl.getPayouts);
router.patch('/payouts/:id/approve', ctrl.approvePayout);

module.exports = router;
