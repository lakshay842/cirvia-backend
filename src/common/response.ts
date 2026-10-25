import type { Response } from 'express';

export interface ApiMeta {
  page?: number;
  limit?: number;
  total?: number;
  totalPages?: number;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  [key: string]: unknown;
}

export interface SuccessResponse<T = unknown> {
  success: true;
  message: string;
  data: T;
  meta: ApiMeta;
}

export interface ErrorField {
  field: string;
  message: string;
}

export interface ErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    requestId?: string;
    details?: Record<string, unknown>;
    errors?: ErrorField[];
  };
}

export function sendSuccess<T>(
  res: Response,
  options: {
    message?: string;
    data?: T;
    meta?: ApiMeta;
    statusCode?: number;
  } = {},
): Response {
  const payload: SuccessResponse<T> = {
    success: true,
    message: options.message ?? 'Success',
    data: (options.data ?? {}) as T,
    meta: options.meta ?? {},
  };

  return res.status(options.statusCode ?? 200).json(payload);
}

export function sendError(
  res: Response,
  options: {
    message: string;
    code: string;
    statusCode?: number;
    requestId?: string;
    details?: Record<string, unknown>;
    errors?: ErrorField[];
  },
): Response {
  const payload: ErrorResponse = {
    success: false,
    message: options.message,
    error: {
      code: options.code,
    },
  };

  if (options.requestId) {
    payload.error.requestId = options.requestId;
  }
  if (options.details) {
    payload.error.details = options.details;
  }
  if (options.errors) {
    payload.error.errors = options.errors;
  }

  return res.status(options.statusCode ?? 500).json(payload);
}
