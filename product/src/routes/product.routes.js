const express = require('express');
const multer = require('multer');
const productController = require('../controllers/product.controller');
const createAuthMiddleware = require('../middlewares/auth.middleware');
const { createProductValidators } = require('../validators/product.validators');

const router = express.Router();

const upload = multer({ storage: multer.memoryStorage() });

// POST /api/products
router.post(
    '/',
    createAuthMiddleware([ 'admin', 'seller' ]),
    upload.array('images', 5),
    createProductValidators,
    productController.createProduct
);

// GET /api/products/
router.get('/',productController.getProducts);


// NOTE : both /seller and /:id routes are GET routes, order matters here
// Place /seller route before /:id route to avoid conflicts

// GET /api/products/seller
router.get('/seller',createAuthMiddleware(['seller']), productController.getProductsBySeller);

// GET /api/products/:id
router.get('/:id',productController.getProductById);

// DELETE /api/products/:id
router.delete('/:id',createAuthMiddleware(['seller']),productController.deleteProductById);

// PATCH /api/products/:id
router.patch('/:id',
    createAuthMiddleware(['seller']),
    productController.updateProductById
);



module.exports = router;