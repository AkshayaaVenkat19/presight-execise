const { AppError, DatabaseError, InternalError, NotFoundError } = require('../errors/custom.error');
const { logger, sanitizeUrl, serializeError } = require('../utils/logger');

function notFoundHandler(req, _res, next) {
  next(new NotFoundError(`Route ${req.method} ${req.path} does not exist`));
}

function toAppError(error) {
  if (error instanceof AppError) return error;
  if (error?.type === 'entity.parse.failed' && error.status === 400) {
    return new AppError('Request body must contain valid JSON', 400, 'INVALID_JSON');
  }
  if (error?.type === 'entity.too.large' && error.status === 413) {
    return new AppError('Request body exceeds the allowed size', 413, 'PAYLOAD_TOO_LARGE');
  }
  if (typeof error?.code === 'string' && error.code.startsWith('SQLITE_')) return new DatabaseError();
  return new InternalError();
}

/**
 * Single exit point for every failure. Internal details stay in the logs;
 */
// eslint-disable-next-line no-unused-vars -- Express identifies error handlers by arity.
function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const { statusCode, code, message, details } = toAppError(error);
  const timestamp = new Date().toISOString();

  if (statusCode >= 500) {
    const isDatabaseFailure = code === 'DATABASE_ERROR';
    logger.error(isDatabaseFailure ? 'database.error' : 'server.error', {
      requestId: req.id,
      method: req.method,
      endpoint: sanitizeUrl(req.originalUrl),
      statusCode,
      code,
      ...serializeError(error),
    });
  }

  const body = { code, message };
  if (details?.length) body.details = details;
  body.path = req.path;
  body.timestamp = timestamp;

  res.status(statusCode).json({ error: body });
}

module.exports = { notFoundHandler, errorHandler };
