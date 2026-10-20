import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { pinoHttp } from 'pino-http';
import crypto from 'node:crypto';
import swaggerUi from 'swagger-ui-express';
import { env } from './config/env';
import { logger } from './lib/logger';
import { timezone } from './middleware/timezone';
import { originVerify } from './middleware/originVerify';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler, notFound } from './middleware/error';
import { authRouter } from './modules/auth/auth.routes';
import { sheetRouter } from './modules/sheet/sheet.routes';
import { progressRouter } from './modules/progress/progress.routes';
import { calendarRouter } from './modules/calendar/calendar.routes';
import { usersRouter } from './modules/users/users.routes';
import { healthRouter } from './modules/health/health.routes';
import { openApiDocument } from './docs/openapi';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY); // correct client IPs behind CloudFront + ALB

  // Only CloudFront may talk to the API in production (no-op when ORIGIN_VERIFY_SECRET is unset).
  app.use(originVerify);

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = (req.headers['x-request-id'] as string) ?? crypto.randomUUID();
        res.setHeader('X-Request-Id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
    }),
  );

  // API docs are served before helmet's strict CSP (Swagger UI needs inline scripts).
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, { customSiteTitle: 'DSA Sheet API' }),
  );
  app.get('/api/openapi.json', (_req, res) => res.json(openApiDocument));

  app.use(helmet());
  if (env.CORS_ORIGINS.length) app.use(cors({ origin: env.CORS_ORIGINS, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());
  app.use(timezone);

  const api = express.Router();
  // Per-user data must never be cached by browsers or CloudFront; public routes (e.g. /sheet) override this.
  api.use((_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });
  api.use('/health', healthRouter);
  api.use(apiLimiter);
  api.use('/auth', authRouter);
  api.use('/sheet', sheetRouter);
  api.use('/progress', progressRouter);
  api.use('/calendar', calendarRouter);
  api.use('/users', usersRouter);
  app.use('/api/v1', api);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
