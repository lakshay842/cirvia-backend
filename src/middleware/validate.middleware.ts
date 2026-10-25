import type { Request, Response, NextFunction } from 'express';
import { ZodError, type ZodSchema } from 'zod';
import { ValidationError } from '@errors/index.js';

type RequestPart = 'body' | 'query' | 'params' | 'headers';

export function validateRequest(schema: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      const parts: RequestPart[] = ['body', 'query', 'params', 'headers'];

      for (const part of parts) {
        const partSchema = schema[part];
        if (!partSchema) {
          continue;
        }
        const parsed = partSchema.parse(req[part]);
        if (part === 'query') {
          const query = req.query as Record<string, unknown>;
          for (const key of Object.keys(query)) {
            delete query[key];
          }
          Object.assign(query, parsed);
        } else {
          Object.assign(req, { [part]: parsed });
        }
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstIssue = error.issues[0];
        const field = firstIssue?.path.join('.') ?? 'unknown';
        next(
          new ValidationError(firstIssue?.message ?? 'Validation failed', {
            field,
            details: { issues: error.issues },
          }),
        );
        return;
      }
      next(error);
    }
  };
}
