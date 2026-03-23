const rateLimit = require('express-rate-limit');
const logger = require('../config/logger');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  handler: (req, res, next, options) => {
    logger.warn(`RATE LIMIT (auth): IP ${req.ip} exceeded login attempts`);
    res.status(429).json(options.message);
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

const transferLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: parseInt(process.env.TRANSFER_RATE_LIMIT_MAX, 10) || 10,
  message: { error: 'Transfer limit reached. Maximum 10 transfers per hour.' },
  handler: (req, res, next, options) => {
    logger.warn(`RATE LIMIT (transfer): User ${req.user?._id} exceeded transfer limit`);
    res.status(429).json(options.message);
  },
  keyGenerator: (req) => req.user?._id?.toString() || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});

const twoFactorLimiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 3,
  message: { error: 'Too many authenticator attempts. Please wait 3 minutes.' },
  keyGenerator: (req) => req.body?.preAuthToken || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  authLimiter,
  transferLimiter,
  twoFactorLimiter,
};
