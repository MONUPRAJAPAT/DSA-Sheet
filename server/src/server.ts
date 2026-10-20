import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { logger } from './lib/logger';
import { createApp } from './app';

async function main() {
  await connectDB();
  const server = createApp().listen(env.PORT, () =>
    logger.info(`🚀 API listening on http://localhost:${env.PORT}`),
  );
  // Keep-alive must exceed the ALB idle timeout (60s) to avoid 502s.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;

  // Graceful shutdown: stop accepting connections, drain in-flight requests, close DB.
  const shutdown = (signal: string) => {
    logger.info({ signal }, 'Shutting down');
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
