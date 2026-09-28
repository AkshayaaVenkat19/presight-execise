const { AuthService, SESSION_TOKEN_HEX_LENGTH } = require('../services/auth.service');
const { AppError } = require('../errors/custom.error');

const COOKIE_NAME = 'presight_session';
const TOKEN_PATTERN = new RegExp(`^[a-f0-9]{${SESSION_TOKEN_HEX_LENGTH}}$`);

function getSessionToken(req) {
  const cookie = (req.headers.cookie || '').split(';')
    .map((part) => part.trim()).find((part) => part.startsWith(`${COOKIE_NAME}=`));
  const token = cookie?.slice(COOKIE_NAME.length + 1);
  return token && TOKEN_PATTERN.test(token) ? token : null;
}

async function requireAuth(req, _res, next) {
  req.user = await AuthService.getUser(getSessionToken(req));
  next();
}

// JSON-only writes prevent cross-site form submissions to cookie-based endpoints.
function requireJson(req, _res, next) {
  if (!req.is('application/json')) {
    throw new AppError('Content-Type must be application/json', 415, 'UNSUPPORTED_MEDIA_TYPE');
  }
  next();
}

module.exports = { COOKIE_NAME, getSessionToken, requireAuth, requireJson };
