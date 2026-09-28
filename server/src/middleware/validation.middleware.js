const { ValidationError } = require('../errors/custom.error');

/**
 * Validates and normalises the query string against a schema before the
 * controller runs, exposing the clean result as `req.validated`.
 */
function validateQuery(schema) {
  const fields = Object.entries(schema);

  return (req, _res, next) => {
    const validated = {};
    const details = [];

    for (const [field, parse] of fields) {
      try {
        validated[field] = parse(req.query[field]);
      } catch (error) {
        details.push({ field, message: error.message });
      }
    }

    if (details.length > 0) {
      // The top-level message repeats the field names so it reads on its own.
      const message = details.map(({ field, message: reason }) => `${field} ${reason}`).join('; ');
      return next(new ValidationError(message, details));
    }

    req.validated = validated;
    next();
  };
}

module.exports = { validateQuery };
