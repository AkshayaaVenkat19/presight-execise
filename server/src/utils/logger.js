/**
 * Minimal structured logger. Every line is a single JSON object so the output
 * stays greppable locally and parseable by a log collector in production.
 */
const LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 100 };
const configuredLevel = process.env.LOG_LEVEL || (process.env.NODE_ENV === 'test' ? 'silent' : 'info');
const threshold = LEVELS[configuredLevel] ?? LEVELS.info;

// Anything that could carry credentials or personal data never reaches the log.
const REDACTED_KEYS = new Set([
  'password',
  'passwordhash',
  'password_hash',
  'token',
  'accesstoken',
  'refreshtoken',
  'sessiontoken',
  'authorization',
  'cookie',
  'setcookie',
  'set-cookie',
  'secret',
  'apikey',
  'api_key',
]);

const isSensitiveKey = (key) => REDACTED_KEYS.has(String(key).toLowerCase().replace(/[-_]/g, ''));

/**
 * Keeps the request target useful for debugging while dropping query values,
 * which may contain user-supplied search terms or credentials.
 */
function sanitizeUrl(originalUrl = '') {
  const [path, query] = String(originalUrl).split('?');
  if (!query) return path;
  const keys = new URLSearchParams(query);
  const safe = [...keys.keys()]
    .map((key) => `${key}=${isSensitiveKey(key) ? '[REDACTED]' : keys.get(key)}`)
    .join('&');
  return `${path}?${safe}`;
}

function write(level, message, meta) {
  if (LEVELS[level] < threshold) return;
  const entry = { timestamp: new Date().toISOString(), level, message, ...meta };
  const line = JSON.stringify(entry, (key, value) => (isSensitiveKey(key) ? '[REDACTED]' : value));
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

/**
 * Errors are logged by name, message and stack only. The raw error object is
 * never spread into the entry so attached request payloads cannot leak.
 */
function serializeError(error) {
  if (!(error instanceof Error)) return { error: { message: String(error) } };
  return {
    error: {
      name: error.name,
      message: error.message,
      code: error.code,
      stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    },
  };
}

const logger = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
};

module.exports = { logger, sanitizeUrl, serializeError };
