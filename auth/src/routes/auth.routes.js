const express = require('express');
const validators = require('../middlewares/validator.middleware');
const authController = require("../controllers/auth.controller")

const router = express.Router();

// POST /auth/register
router.post('/register', validators.registerUserValidations, authController.registerUser);



module.exports = router;
