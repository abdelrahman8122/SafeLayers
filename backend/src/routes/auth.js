const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, twoFactorLimiter } = require('../middleware/rateLimiter');
const { loginRules, registerRules, passwordRules, validate } = require('../middleware/validators');

const router = express.Router();

router.get('/csrf-token', authController.getCsrfToken);

router.post('/register', registerRules, validate, authController.register);
router.post('/login', authLimiter, loginRules, validate, authController.login);
router.post(
  '/setup-totp/confirm',
  twoFactorLimiter,
  [
    body('preAuthToken').notEmpty().withMessage('Pre-auth token is required'),
    body('token')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('Authenticator code must be 6 digits'),
  ],
  validate,
  authController.confirmTotpSetup
);
router.post(
  '/verify-totp',
  twoFactorLimiter,
  [
    body('preAuthToken').notEmpty().withMessage('Pre-auth token is required'),
    body('token')
      .isLength({ min: 6, max: 6 })
      .isNumeric()
      .withMessage('Authenticator code must be 6 digits'),
  ],
  validate,
  authController.verifyTotpLogin
);
router.post('/refresh', authController.refreshToken);

router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.patch('/change-password', protect, passwordRules, validate, authController.changePassword);

module.exports = router;
