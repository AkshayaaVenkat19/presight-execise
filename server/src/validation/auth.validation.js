const { ValidationError } = require('../errors/custom.error');

function validateLogin(req, _res, next) {
  const { username, password } = req.body || {};
  if (typeof username !== 'string' || !username.trim() || username.length > 100 ||
      typeof password !== 'string' || !password || password.length > 256) {
    throw new ValidationError('Enter a username (up to 100 characters) and password (up to 256 characters)');
  }
  req.validated = { username: username.trim(), password };
  next();
}

module.exports = { validateLogin };
