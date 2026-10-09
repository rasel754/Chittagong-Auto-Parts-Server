import rateLimit from 'express-rate-limit';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { ResponseUtil } from '../common/response.js';

const createRateLimiter = (typeof rateLimit === 'function' ? rateLimit : (rateLimit as any).default || rateLimit) as typeof rateLimit;

export const generalRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    ResponseUtil.error(
      res,
      'Too many requests. Please try again later.',
      'RATE_LIMIT_EXCEEDED',
      429
    );
  }
});

export const authRateLimiter = createRateLimiter({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req: Request, res: Response) => {
    ResponseUtil.error(
      res,
      'Too many authentication attempts. Please try again after 15 minutes.',
      'AUTH_RATE_LIMIT_EXCEEDED',
      429
    );
  }
});
