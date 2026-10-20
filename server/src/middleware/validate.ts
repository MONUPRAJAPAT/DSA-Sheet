import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';
import { AppError } from '../lib/errors';

interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

/** Validates & coerces request input with Zod. Rejects with a 400 listing every issue. */
export const validate =
  (schemas: Schemas): RequestHandler =>
  (req, _res, next) => {
    for (const key of ['params', 'query', 'body'] as const) {
      const schema = schemas[key];
      if (!schema) continue;
      const result = schema.safeParse(req[key] ?? {});
      if (!result.success) {
        throw new AppError(
          400,
          'VALIDATION_ERROR',
          result.error.issues[0]?.message ?? 'Invalid request',
          result.error.issues.map((i) => ({
            path: [key, ...i.path].join('.'),
            message: i.message,
          })),
        );
      }
      if (key === 'body') req.body = result.data;
      else if (key === 'query') req.validatedQuery = result.data;
    }
    next();
  };
