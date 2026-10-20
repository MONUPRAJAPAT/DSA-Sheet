import bcrypt from 'bcryptjs';
import type { LoginInput, RegisterInput } from '@dsa/shared';
import { env } from '../../config/env';
import { AppError } from '../../lib/errors';
import { SessionModel, UserModel, type UserDoc } from '../../models';
import { generateRefreshToken, hashToken, signAccessToken } from './tokens';

const BCRYPT_ROUNDS = 12;
// Pre-computed hash used to keep login timing constant when the email does not exist.
const DUMMY_HASH = '$2b$12$2QcgrwVVaqywhLtgphSAseIaTNlqxPFLB3xOyE3DknSG6hBZe6KZq';

interface ClientInfo {
  userAgent?: string;
  ip?: string;
}

export interface IssuedTokens {
  user: UserDoc;
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

async function issueTokens(user: UserDoc, client: ClientInfo): Promise<IssuedTokens> {
  const refreshToken = generateRefreshToken();
  const refreshExpiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 86_400_000);
  await SessionModel.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    userAgent: client.userAgent?.slice(0, 200) ?? '',
    ip: client.ip ?? '',
    expiresAt: refreshExpiresAt,
  });
  return {
    user,
    accessToken: signAccessToken({ sub: user.id, role: user.role }),
    refreshToken,
    refreshExpiresAt,
  };
}

export async function register(input: RegisterInput, client: ClientInfo) {
  const exists = await UserModel.exists({ email: input.email });
  if (exists) throw AppError.conflict('An account with this email already exists');
  const user = await UserModel.create({
    name: input.name,
    email: input.email,
    passwordHash: await bcrypt.hash(input.password, BCRYPT_ROUNDS),
  });
  return issueTokens(user, client);
}

export async function login(input: LoginInput, client: ClientInfo) {
  const user = await UserModel.findOne({ email: input.email }).select('+passwordHash');
  const valid = await bcrypt.compare(input.password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !valid)
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Incorrect email or password');
  return issueTokens(user, client);
}

export async function loginDemo(client: ClientInfo) {
  // A clear message (instead of "incorrect password") if the database was never seeded.
  if (!(await UserModel.exists({ email: env.DEMO_EMAIL }))) {
    throw new AppError(503, 'DEMO_UNAVAILABLE', 'The demo account isn’t available right now. Please create a free account instead.');
  }
  return login({ email: env.DEMO_EMAIL, password: env.DEMO_PASSWORD }, client);
}

/** Rotates the refresh token: the old session is consumed and a new one is issued. */
export async function refresh(refreshToken: string | undefined, client: ClientInfo) {
  if (!refreshToken) throw AppError.unauthorized('No active session');
  const session = await SessionModel.findOneAndDelete({ tokenHash: hashToken(refreshToken) });
  if (!session || session.expiresAt < new Date())
    throw AppError.unauthorized('Session expired, please log in again');
  const user = await UserModel.findById(session.userId);
  if (!user) throw AppError.unauthorized('Account no longer exists');
  return issueTokens(user, client);
}

export async function logout(refreshToken: string | undefined) {
  if (refreshToken) await SessionModel.deleteOne({ tokenHash: hashToken(refreshToken) });
}

export async function logoutAll(userId: string) {
  await SessionModel.deleteMany({ userId });
}
