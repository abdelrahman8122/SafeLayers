const jwt = require('jsonwebtoken');
const User = require('../models/User');
const logger = require('../config/logger');

const getAccessToken = (req) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.split(' ')[1];
  }

  return req.cookies?.accessToken;
};

const protect = async (req, res, next) => {
  try {
    const token = getAccessToken(req);

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated. Please log in.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: 'Session expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
        });
      }

      return res.status(401).json({ error: 'Invalid token.' });
    }

    if (decoded.type !== 'access') {
      return res.status(401).json({ error: 'Invalid session token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'User no longer exists or is deactivated.' });
    }

    if (user.isLocked) {
      return res.status(423).json({ error: 'Account locked due to too many failed attempts.' });
    }

    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        error: 'Password recently changed. Please log in again.',
      });
    }

    req.user = user;
    req.sessionId = decoded.sessionId;

    logger.info(`AUTH: User ${user._id} (${user.role}) accessed ${req.method} ${req.path}`);
    next();
  } catch (error) {
    logger.error(`Auth middleware error: ${error.message}`);
    res.status(500).json({ error: 'Authentication error.' });
  }
};

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      logger.warn(
        `RBAC: User ${req.user._id} (${req.user.role}) attempted to access ${req.method} ${req.path}`
      );
      return res.status(403).json({ error: 'You do not have permission to perform this action.' });
    }

    next();
  };
};

module.exports = {
  protect,
  restrictTo,
};
