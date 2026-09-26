/**
 * Application error hierarchy. Every error carries the HTTP status and the
 * stable machine-readable code that the global error handler serialises.
 */
class AppError extends Error {
  constructor(message, statusCode, code, details) {
    super(message);
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = true;
    Error.captureStackTrace(this, new.target);
  }
}

class ValidationError extends AppError {
  constructor(message = 'One or more query parameters are invalid', details = []) {
    super(message, 400, 'INVALID_PARAMETER', details);
  }
}

class NotFoundError extends AppError {
  constructor(message = 'Resource not found') {
    super(message, 404, 'NOT_FOUND');
  }
}

class MethodNotAllowedError extends AppError {
  constructor(message = 'Method not allowed') {
    super(message, 405, 'METHOD_NOT_ALLOWED');
  }
}

class DatabaseError extends AppError {
  constructor(message = 'Database query failed') {
    super(message, 500, 'DATABASE_ERROR');
  }
}

class InternalError extends AppError {
  constructor(message = 'An unexpected error occurred') {
    super(message, 500, 'INTERNAL_ERROR');
  }
}

class ServiceUnavailableError extends AppError {
  constructor(message = 'Service temporarily unavailable') {
    super(message, 503, 'SERVICE_UNAVAILABLE');
  }
}

module.exports = {
  AppError,
  ValidationError,
  NotFoundError,
  MethodNotAllowedError,
  DatabaseError,
  InternalError,
  ServiceUnavailableError,
};
