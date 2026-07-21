'use strict';

/**
 * Global error handling middleware.
 * Must have four parameters so Express recognizes it as an error handler.
 */
function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  // Handle specific known error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: err.message || 'Validation failed.',
      error: err.details || null,
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: err.message || 'Unauthorized.',
      error: null,
    });
  }

  if (err.name === 'ForbiddenError') {
    return res.status(403).json({
      success: false,
      message: err.message || 'Forbidden.',
      error: null,
    });
  }

  if (err.name === 'NotFoundError') {
    return res.status(404).json({
      success: false,
      message: err.message || 'Resource not found.',
      error: null,
    });
  }

  // MongoDB duplicate key error (e.g. unique email)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      success: false,
      message: `A record with that ${field} already exists.`,
      error: null,
    });
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: `Invalid ${err.path}: ${err.value}`,
      error: null,
    });
  }

  // Default: Internal Server Error
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    success: false,
    message: err.message || 'Internal server error.',
    error: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
}

module.exports = { errorHandler };
