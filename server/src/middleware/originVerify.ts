import type { RequestHandler } from 'express';
import crypto from 'node:crypto';
import { env } from '../config/env';

/**
 * When the API runs directly behind CloudFront (no load balancer), CloudFront adds a secret
 * `X-Origin-Verify` header to every request it forwards. Requests without it are rejected, so the
 * server can't be used by bypassing the CDN. Disabled when ORIGIN_VERIFY_SECRET is not set (local dev).
 */
export const originVerify: RequestHandler = (req, res, next) => {
  const secret = env.ORIGIN_VERIFY_SECRET;
  if (!secret) return next();
  const given = req.header('x-origin-verify') ?? '';
  const ok =
    given.length === secret.length &&
    crypto.timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (ok) return next();
  res
    .status(403)
    .json({
      success: false,
      error: { code: 'FORBIDDEN', message: 'Direct access is not allowed' },
    });
};
