const express = require('express');
const router = express.Router();
const loanController = require('../controllers/loanController');
const { protect, restrictTo } = require('../middleware/auth');
const { body } = require('express-validator');
const { validate } = require('../middleware/validators');

// Public — loan calculator
router.get('/calculate', loanController.calculate);

// Protected
router.use(protect, restrictTo('customer'));
router.get('/', loanController.getLoan);
router.post('/apply', [
  body('loanType').isIn(['personal', 'home', 'car', 'business']),
  body('amount').isFloat({ min: 1000 }),
  body('termMonths').isInt({ min: 6, max: 300 }),
], validate, loanController.applyLoan);

module.exports = router;
