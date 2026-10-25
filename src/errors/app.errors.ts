import { HTTP_STATUS, ERROR_CODES } from '@constants/index.js';
import { BaseError } from './base.error.js';

export class ValidationError extends BaseError {
  constructor(
    message: string,
    options?: { field?: string; details?: Record<string, unknown> },
  ) {
    super(message, HTTP_STATUS.BAD_REQUEST, ERROR_CODES.VALIDATION_ERROR, options);
  }
}

export class UnauthorizedError extends BaseError {
  constructor(message = 'Unauthorized access.') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.UNAUTHORIZED);
  }
}

export class ForbiddenError extends BaseError {
  constructor(message = 'Access forbidden.') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FORBIDDEN);
  }
}

export class NotFoundError extends BaseError {
  constructor(message = 'Resource not found.') {
    super(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.NOT_FOUND);
  }
}

export class ConflictError extends BaseError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, HTTP_STATUS.CONFLICT, ERROR_CODES.CONFLICT, details ? { details } : undefined);
  }
}

export class InternalServerError extends BaseError {
  constructor(message = 'An unexpected error occurred.') {
    super(message, HTTP_STATUS.INTERNAL_SERVER_ERROR, ERROR_CODES.INTERNAL_ERROR, {
      isOperational: false,
    });
  }
}

export class RateLimitError extends BaseError {
  constructor(message = 'Too many requests. Please try again later.') {
    super(message, HTTP_STATUS.TOO_MANY_REQUESTS, ERROR_CODES.RATE_LIMIT_EXCEEDED);
  }
}

export class InvalidCredentialsError extends BaseError {
  constructor(message = 'Invalid credentials.') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.INVALID_CREDENTIALS);
  }
}

export class AccountLockedError extends BaseError {
  constructor(message = 'Account is temporarily locked. Please try again later.') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.ACCOUNT_LOCKED);
  }
}

export class TokenInvalidError extends BaseError {
  constructor(message = 'Invalid or expired token.') {
    super(message, HTTP_STATUS.UNAUTHORIZED, ERROR_CODES.TOKEN_INVALID);
  }
}

export class FollowNotAllowedError extends BaseError {
  constructor(message = 'Cannot follow this user.') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.FOLLOW_NOT_ALLOWED);
  }
}

export class TrustScoreUnavailableError extends BaseError {
  constructor(message = 'Trust score unavailable.') {
    super(message, HTTP_STATUS.NOT_FOUND, ERROR_CODES.TRUST_SCORE_UNAVAILABLE);
  }
}

export class UnauthorizedActionError extends BaseError {
  constructor(message = 'Unauthorized action.') {
    super(message, HTTP_STATUS.FORBIDDEN, ERROR_CODES.UNAUTHORIZED_ACTION);
  }
}
