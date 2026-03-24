const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';

  // Mongoose duplicate key
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} already exists`;
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Mongoose cast error (invalid ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid ID format';
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.code === 'EBADCSRFTOKEN') {
    statusCode = 403;
    message = 'Invalid or missing CSRF token';
  }

  // Log server and client errors (client errors are useful in production debugging).
  if (statusCode >= 500) {
    logger.error(`${statusCode} - ${message}\n${err.stack}`);
  } else if (statusCode >= 400) {
    logger.warn(`${statusCode} ${req.method} ${req.originalUrl} from ${req.ip} - ${message}`);
  }

  res.status(statusCode).json({
    error: message,
    // Only show stack in development
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

module.exports = errorHandler;
