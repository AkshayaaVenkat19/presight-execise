const { randomUUID } = require('node:crypto');
const { logger, sanitizeUrl } = require('../utils/logger');

/**
 * Logs one line per completed request: method, endpoint, status code and
 * response time. Bodies, headers and cookies are deliberately left out.
 */
function requestLogger(req, res, next) {
  const startedAt = process.hrtime.bigint();
  req.id = req.headers['x-request-id'] || randomUUID();
  res.setHeader('X-Request-Id', req.id);

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const meta = {
      requestId: req.id,
      method: req.method,
      endpoint: sanitizeUrl(req.originalUrl),
      statusCode: res.statusCode,
      responseTimeMs: Number(durationMs.toFixed(2)),
    };
    const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
    logger[level]('request.completed', meta);
  });

  next();
}

module.exports = { requestLogger };
