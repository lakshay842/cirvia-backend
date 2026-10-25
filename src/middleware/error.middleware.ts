import type { Request, Response, NextFunction } from 'express';
import { BaseError } from '@errors/index.js';
import { sendError } from '@common/index.js';
import { getConfig } from '@config/index.js';
import { getLogger } from '@logger/index.js';
import { ZodError } from 'zod';
import { ERROR_CODES } from '@constants/index.js';

const logger = getLogger();

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const config = getConfig();
  const requestId = req.requestId;

  if (error instanceof BaseError) {
    if (!error.isOperational) {
      logger.error({ err: error, requestId }, 'Non-operational error');
    } else {
      logger.warn({ err: error, requestId }, error.message);
    }

    const errorPayload: Parameters<typeof sendError>[1] = {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      requestId,
    };

    if (error.details) {
      errorPayload.details = error.details;
      const issues = error.details.issues;
      if (Array.isArray(issues)) {
        errorPayload.errors = issues.map((issue) => {
          const zodIssue = issue as { path?: unknown[]; message?: string };
          return {
            field: Array.isArray(zodIssue.path) ? zodIssue.path.join('.') : 'unknown',
            message: typeof zodIssue.message === 'string' ? zodIssue.message : error.message,
          };
        });
      }
    }
    if (error.field && !errorPayload.errors) {
      errorPayload.errors = [{ field: error.field, message: error.message }];
    }

    sendError(res, errorPayload);
    return;
  }

  if (error instanceof ZodError) {
    sendError(res, {
      message: 'Validation failed',
      code: ERROR_CODES.VALIDATION_ERROR,
      statusCode: 400,
      requestId,
      errors: error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      })),
    });
    return;
  }

  logger.error({ err: error, requestId }, 'Unhandled error');

  const message =
    config.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : error instanceof Error
        ? error.message
        : 'An unexpected error occurred.';

  sendError(res, {
    message,
    code: ERROR_CODES.INTERNAL_ERROR,
    statusCode: 500,
    requestId,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  sendError(res, {
    message: `Route ${req.method} ${req.originalUrl} not found.`,
    code: ERROR_CODES.NOT_FOUND,
    statusCode: 404,
    requestId: req.requestId,
  });
}
