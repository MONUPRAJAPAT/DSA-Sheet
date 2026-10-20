import type { CookieOptions, Request, Response } from 'express';
import type { AuthResponse } from '@dsa/shared';
import { isProd } from '../../config/env';
import { ok } from '../../lib/http';
import { AppError } from '../../lib/errors';
import { UserModel } from '../../models';
import { userId } from '../../middleware/auth';
import { toUserDTO } from '../users/users.mapper';
import * as auth from './auth.service';

export const REFRESH_COOKIE = 'dsa_rt';

const cookieOptions = (expires?: Date): CookieOptions => ({
  httpOnly: true, // not readable by JS → safe from XSS token theft
  secure: isProd, // HTTPS only in production
  sameSite: 'strict', // client and API share one origin (CloudFront /api/* → ALB) → CSRF-safe
  path: '/api/v1/auth', // cookie is only ever sent to the auth endpoints
  ...(expires ? { expires } : {}),
});

const client = (req: Request) => ({ userAgent: req.get('user-agent'), ip: req.ip });

function sendSession(res: Response, tokens: auth.IssuedTokens, status = 200) {
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, cookieOptions(tokens.refreshExpiresAt));
  const body: AuthResponse = { user: toUserDTO(tokens.user), accessToken: tokens.accessToken };
  return ok(res, body, status);
}

export async function register(req: Request, res: Response) {
  sendSession(res, await auth.register(req.body, client(req)), 201);
}

export async function login(req: Request, res: Response) {
  sendSession(res, await auth.login(req.body, client(req)));
}

export async function demo(req: Request, res: Response) {
  sendSession(res, await auth.loginDemo(client(req)));
}

export async function refresh(req: Request, res: Response) {
  try {
    sendSession(res, await auth.refresh(req.cookies?.[REFRESH_COOKIE], client(req)));
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE, cookieOptions());
    throw err;
  }
}

export async function logout(req: Request, res: Response) {
  await auth.logout(req.cookies?.[REFRESH_COOKIE]);
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  ok(res, { loggedOut: true });
}

export async function logoutAll(req: Request, res: Response) {
  await auth.logoutAll(userId(req));
  res.clearCookie(REFRESH_COOKIE, cookieOptions());
  ok(res, { loggedOut: true });
}

export async function me(req: Request, res: Response) {
  const user = await UserModel.findById(userId(req));
  if (!user) throw AppError.notFound('User');
  ok(res, toUserDTO(user));
}
