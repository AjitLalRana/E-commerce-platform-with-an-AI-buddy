const express = require('express');
const router = express.Router();

const createAuthMiddleware = require('../middlewares/auth.middleware.js');
const cartController = require('../controllers/cart.controller.js');
const cartValidation = require('../middlewares/cartValidation.middleware');

// GET /api/cart - Get user's cart
router.get('/',createAuthMiddleware(['user']),cartController.getCart);

// POST /api/cart/items - Add item to cart
router.post('/items', createAuthMiddleware(['user']),cartValidation.addItemValidator, cartController.addItemToCart);




module.exports = router;