const { randomUUID } = require('node:crypto');
const { logger, sanitizeUrl } = require('../utils/logger');

const NANOSECONDS_PER_MILLISECOND = 1e6;
const REQUEST_ID_HEADER = 'x-request-id';
const SERVER_ERROR_STATUS = 500;
const CLIENT_ERROR_STATUS = 400;

/**
 * Logs one line per completed request: method, endpoint, status code and
 * response time. Bodies, headers and cookies are deliberately left out.
 */
function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  req.id = req.headers[REQUEST_ID_HEADER] || randomUUID();
  res.setHeader('X-Request-Id', req.id);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / NANOSECONDS_PER_MILLISECOND;
    const meta = {
      requestId: req.id,
      method: req.method,
      endpoint: sanitizeUrl(req.originalUrl),
      statusCode: res.statusCode,
      responseTimeMs: Number(durationMs.toFixed(2)),
    };
    const level = res.statusCode >= SERVER_ERROR_STATUS ? 'error'
      : res.statusCode >= CLIENT_ERROR_STATUS ? 'warn' : 'info';
    logger[level]('request.completed', meta);
  });

  next();
}

module.exports = { requestLogger };
