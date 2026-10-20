import type { RequestHandler } from 'express';
import { AppError } from '../lib/errors';
import { verifyAccessToken } from '../modules/auth/tokens';

/** Verifies the `Authorization: Bearer <accessToken>` header. Stateless — no DB hit. */
export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw AppError.unauthorized();
  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = { id: payload.sub, role: payload.role };
    next();
  } catch {
    throw new AppError(401, 'TOKEN_EXPIRED', 'Session expired, please refresh');
  }
};

export const requireRole =
  (role: 'admin'): RequestHandler =>
  (req, _res, next) => {
    if (req.user?.role !== role) throw AppError.forbidden();
    next();
  };

/** Narrow `req.user` inside authenticated handlers. */
export function userId(req: Express.Request): string {
  if (!req.user) throw AppError.unauthorized();
  return req.user.id;
}
