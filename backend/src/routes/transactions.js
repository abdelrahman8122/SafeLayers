const express = require('express');
const router = express.Router();
const txController = require('../controllers/transactionController');
const { protect, restrictTo } = require('../middleware/auth');
const { transferLimiter } = require('../middleware/rateLimiter');
const { transferRules, amountRules, validate } = require('../middleware/validators');

router.use(protect, restrictTo('customer')); // Customer banking routes only

router.post('/transfer', transferLimiter, transferRules, validate, txController.transfer);
router.post('/deposit', amountRules, validate, txController.deposit);
router.post('/withdraw', amountRules, validate, txController.withdraw);
router.get('/history', txController.getHistory);

module.exports = router;
