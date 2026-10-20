import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(4000),
  MONGODB_URI: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  /** Shared secret CloudFront sends as X-Origin-Verify; when set, requests without it are rejected. */
  ORIGIN_VERIFY_SECRET: z.string().min(16).optional(),
  /** Requests per minute per IP across the API (raise only for load testing). */
  API_RATE_LIMIT: z.coerce.number().int().positive().default(300),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DEMO_EMAIL: z.string().default('demo@dsasheet.dev'),
  DEMO_PASSWORD: z.string().default('Demo@1234'),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  // Fail fast: a misconfigured server should never start.
  console.error('❌ Invalid environment configuration:', z.flattenError(parsed.error).fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
