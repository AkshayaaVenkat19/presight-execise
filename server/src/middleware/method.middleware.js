const { MethodNotAllowedError } = require('../errors/custom.error');

function methodNotAllowed(req, res, next) {
  res.set('Allow', 'GET, HEAD');
  next(new MethodNotAllowedError(`Method ${req.method} is not allowed on ${req.baseUrl}${req.path}`));
}

module.exports = { methodNotAllowed };
