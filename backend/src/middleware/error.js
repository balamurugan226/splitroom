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

  // SQLite unique constraint error
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || (err.message && err.message.includes('UNIQUE constraint failed'))) {
    return res.status(409).json({
      success: false,
      message: 'A record with that value already exists.',
      error: err.message,
    });
  }

  // SQLite foreign key constraint error
  if (err.code === 'SQLITE_CONSTRAINT_FOREIGNKEY' || (err.message && err.message.includes('FOREIGN KEY constraint failed'))) {
    return res.status(400).json({
      success: false,
      message: 'Referenced record does not exist.',
      error: err.message,
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
