const express = require('express');
const validators = require('../middlewares/validator.middleware');
const authController = require("../controllers/auth.controller")
const authMiddleware = require('../middlewares/auth.middleware');

const router = express.Router();

// POST /auth/register
router.post('/register', validators.registerUserValidations, authController.registerUser);

// POST /auth/login
router.post('/login', validators.loginUserValidations, authController.loginUser);

// GET /api/auth/me
router.get('/me', authMiddleware.authMiddleware, authController.getCurrentUser);

// GET /api/auth/logout
router.get('/logout',authMiddleware.authMiddleware, authController.logoutUser)



module.exports = router;
