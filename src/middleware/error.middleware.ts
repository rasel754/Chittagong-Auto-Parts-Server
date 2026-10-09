import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { AppError } from '../common/errors/app.error.js';
import { ResponseUtil } from '../common/response.js';
import { logger } from '../common/logger.js';
import { env } from '../config/env.js';

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  // If response headers are already sent, delegate to Express default error handler
  if (res.headersSent) {
    return _next(err);
  }

  // Handle AppError instances
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error({ err, path: req.path, method: req.method }, err.message);
    }
    ResponseUtil.error(res, err.message, err.code, err.statusCode, err.details);
    return;
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message
    }));
    ResponseUtil.error(res, 'Validation failed', 'VALIDATION_ERROR', 400, details);
    return;
  }

  // Handle Mongoose duplicate key error (11000)
  if ((err as { code?: number }).code === 11000) {
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue;
    const field = keyValue ? Object.keys(keyValue)[0] : 'resource';
    const val = keyValue && field ? keyValue[field] : '';
    ResponseUtil.error(
      res,
      `Duplicate entry: ${field} '${val}' already exists`,
      'DUPLICATE_RESOURCE',
      409,
      { field, value: val }
    );
    return;
  }

  // Handle Mongoose CastError (e.g. invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    ResponseUtil.error(
      res,
      `Invalid ${err.path}: '${err.value}'`,
      'INVALID_IDENTIFIER',
      400,
      { path: err.path, value: err.value }
    );
    return;
  }

  // Handle Mongoose Schema Validation Error
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
    ResponseUtil.error(res, 'Data validation failed', 'SCHEMA_VALIDATION_ERROR', 400, details);
    return;
  }

  // Unhandled internal server errors
  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        name: err.name
      },
      path: req.path,
      method: req.method,
      body: req.body
    },
    'Unhandled server exception'
  );

  const isDev = env.NODE_ENV === 'development';
  ResponseUtil.error(
    res,
    isDev ? err.message : 'An unexpected internal server error occurred',
    'INTERNAL_SERVER_ERROR',
    500,
    isDev ? { stack: err.stack } : undefined
  );
}
