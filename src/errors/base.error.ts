export interface ErrorDetails {
  code: string;
  details?: Record<string, unknown>;
  field?: string;
}

export class BaseError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly details?: Record<string, unknown>;
  public readonly field?: string;

  constructor(
    message: string,
    statusCode: number,
    code: string,
    options?: {
      isOperational?: boolean;
      details?: Record<string, unknown>;
      field?: string;
    },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = options?.isOperational ?? true;
    if (options?.details !== undefined) {
      this.details = options.details;
    }
    if (options?.field !== undefined) {
      this.field = options.field;
    }
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): ErrorDetails {
    const payload: ErrorDetails = { code: this.code };
    if (this.field !== undefined) {
      payload.field = this.field;
    }
    if (this.details !== undefined) {
      payload.details = this.details;
    }
    return payload;
  }
}
