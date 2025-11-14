const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/payment.controller');
const createAuthMiddleware = require('../middlewares/auth.middleware');

router.post('/create/:orderId',createAuthMiddleware(['user']), paymentController.createPayment);

module.exports = router;