import type { Request, Response } from 'express';
import rateLimit, { ipKeyGenerator, type Options } from 'express-rate-limit';
import { env, isTest } from '../config/env';

/** Friendly 429 body that tells the user exactly when they can try again. */
function limited(message: string) {
  return (req: Request, res: Response, _next: unknown, options: Options) => {
    const reset = (req as Request & { rateLimit?: { resetTime?: Date } }).rateLimit?.resetTime;
    const minutes = reset ? Math.max(1, Math.ceil((reset.getTime() - Date.now()) / 60_000)) : null;
    res.status(options.statusCode).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: minutes ? `${message} Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.` : message,
      },
    });
  };
}

const common = { standardHeaders: 'draft-8', legacyHeaders: false, skip: () => isTest } as const;

/**
 * Brute-force protection for password login. Only FAILED attempts count, and the key is
 * IP + email — so a student who logs in successfully is never locked out, and one person
 * guessing passwords on a shared campus network can't lock out everyone else.
 */
export const loginLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `${ipKeyGenerator(req.ip ?? '')}:${String(req.body?.email ?? '').toLowerCase()}`,
  handler: limited('Too many failed login attempts.'),
});

/** Stops scripted mass sign-ups from one address. */
export const registerLimiter = rateLimit({
  ...common,
  windowMs: 60 * 60 * 1000,
  limit: 10,
  handler: limited('Too many accounts created from this network.'),
});

/**
 * The demo account has no secret to brute-force, but each login costs a bcrypt hash,
 * so it gets a generous limit that still blocks CPU-exhaustion abuse.
 */
export const demoLimiter = rateLimit({
  ...common,
  windowMs: 15 * 60 * 1000,
  limit: 60,
  handler: limited('The demo is busy right now.'),
});

/** General API ceiling per IP. For multiple instances, swap in a Redis store (rate-limit-redis). */
export const apiLimiter = rateLimit({
  ...common,
  windowMs: 60 * 1000,
  limit: env.API_RATE_LIMIT,
  handler: limited('Too many requests.'),
});
