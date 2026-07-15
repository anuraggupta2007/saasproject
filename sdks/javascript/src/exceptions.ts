export class EmailConverterError extends Error {
  public statusCode?: number;
  public retryAfter?: number;

  constructor(message: string, statusCode?: number, retryAfter?: number) {
    super(message);
    this.name = 'EmailConverterError';
    this.statusCode = statusCode;
    this.retryAfter = retryAfter;
  }
}

export class AuthenticationError extends EmailConverterError {
  constructor(message = 'Invalid API key') {
    super(message, 401);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends EmailConverterError {
  constructor(message = 'Rate limit exceeded', retryAfter = 60) {
    super(message, 429, retryAfter);
    this.name = 'RateLimitError';
  }
}

export class ValidationError extends EmailConverterError {
  constructor(message: string, statusCode = 400) {
    super(message, statusCode);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends EmailConverterError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

export class ServerError extends EmailConverterError {
  constructor(message = 'Server error') {
    super(message, 500);
    this.name = 'ServerError';
  }
}
