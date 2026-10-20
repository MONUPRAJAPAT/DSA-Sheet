import crypto from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';

export interface AccessPayload {
  sub: string;
  role: 'student' | 'admin';
}

export function signAccessToken(payload: AccessPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as SignOptions['expiresIn'],
    issuer: 'dsa-sheet',
  });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET, { issuer: 'dsa-sheet' });
  if (typeof decoded === 'string' || !decoded.sub) throw new Error('Invalid token');
  return { sub: decoded.sub, role: (decoded as AccessPayload).role };
}

/** Opaque, high-entropy refresh token. Only its hash is persisted. */
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
