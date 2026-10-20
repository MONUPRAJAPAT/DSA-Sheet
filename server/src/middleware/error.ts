import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../lib/errors';
import { isProd } from '../config/env';

export const notFound: RequestHandler = (req) => {
  throw new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} not found`);
};

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let error: AppError;
  if (err instanceof AppError) error = err;
  else if (err instanceof mongoose.Error.CastError)
    error = AppError.badRequest(`Invalid ${err.path}`);
  else if (err?.type === 'entity.parse.failed') error = AppError.badRequest('Malformed JSON body');
  else if (err?.code === 11000) error = AppError.conflict('Resource already exists');
  else {
    req.log?.error({ err }, 'Unhandled error');
    error = new AppError(
      500,
      'INTERNAL_ERROR',
      isProd ? 'Something went wrong' : String(err?.message ?? err),
    );
  }

  res.status(error.status).json({
    success: false,
    error: {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    },
  });
};
