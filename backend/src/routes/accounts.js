const express = require('express');
const router = express.Router();
const accountController = require('../controllers/accountController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('customer'));

router.get('/', accountController.getAccounts);
router.patch('/freeze', accountController.toggleFreeze);

module.exports = router;
