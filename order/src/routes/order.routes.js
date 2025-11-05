const express = require("express")
const createAuthMiddleware = require("../middlewares/auth.middleware")
const orderController = require("../controllers/order.controller")
const validation = require("../middlewares/validation.middleware")


const router = express.Router()

// POST /api/orders/
router.post("/", createAuthMiddleware([ "user" ]), validation.createOrderValidation, orderController.createOrder);

// GET /api/orders/my-orders
router.get('/me', createAuthMiddleware(['user']), orderController.getMyOrders);

// GET /api/orders/:id
router.get('/:id', createAuthMiddleware(['user','admin']), validation.getOrderByIdValidation, orderController.getOrderById);


// post /api/orders/:id/cancel
router.post('/:id/cancel', createAuthMiddleware(['user']), orderController.cancelOrderById);

// PATCH /api/orders/:id/address
router.patch('/:id/address', createAuthMiddleware(['user']), validation.updateAddressValidation, orderController.updateOrderAddress);

module.exports = router;
