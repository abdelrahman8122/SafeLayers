const express = require('express');
const { body, param, query } = require('express-validator');

const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');
const { validate } = require('../middleware/validators');

const router = express.Router();

router.use(protect, restrictTo('admin'));

router.get('/overview', adminController.getOverview);

router.get(
  '/users',
  [
    query('role').optional().isIn(['customer', 'teller', 'admin']),
    query('status').optional().isIn(['active', 'inactive']),
    query('search').optional().isString().trim().isLength({ max: 100 }),
  ],
  validate,
  adminController.getUsers
);

router.patch(
  '/users/:userId/status',
  [
    param('userId').isMongoId().withMessage('Invalid user id'),
    body('isActive').optional().isBoolean().withMessage('isActive must be boolean'),
  ],
  validate,
  adminController.updateUserStatus
);

router.get(
  '/accounts',
  [
    query('type').optional().isIn(['checking', 'savings', 'loan']),
    query('frozen').optional().isIn(['true', 'false']),
  ],
  validate,
  adminController.getAccounts
);

router.patch(
  '/accounts/:accountId/freeze',
  [
    param('accountId').isMongoId().withMessage('Invalid account id'),
    body('isFrozen').optional().isBoolean().withMessage('isFrozen must be boolean'),
  ],
  validate,
  adminController.toggleAccountFreeze
);

router.get('/loans', adminController.getLoans);

router.get(
  '/transactions',
  [query('limit').optional().isInt({ min: 1, max: 100 })],
  validate,
  adminController.getTransactions
);

module.exports = router;
