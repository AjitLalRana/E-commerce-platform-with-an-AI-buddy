const { body,param, validationResult } = require('express-validator');
const mongoose = require('mongoose');

function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation error',
      errors: errors.array()
    });
  }
  next();
}

const addItemValidator = [
  body('productId')
    .isString()
    .withMessage('Product ID must be a string')
    .notEmpty()
    .withMessage('Product ID is required')
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Product ID format'),

  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),

  handleValidationErrors
];

const patchItemValidator = [
   param('productId')
        .isString()
        .withMessage('Product ID must be a string')
        .custom(value => mongoose.Types.ObjectId.isValid(value))
        .withMessage('Invalid Product ID format'),
  body('quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be a positive integer'),  
  handleValidationErrors
];

const deleteItemValidator = [
  param('productId')
    .isString()
    .withMessage("ProductId must be string")
    .custom(value => mongoose.Types.ObjectId.isValid(value))
    .withMessage('Invalid Product ID format'),
  handleValidationErrors
]

module.exports = { 
  addItemValidator,
  patchItemValidator,
  deleteItemValidator
 };
