import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../lib/logger';

export async function connectDB(uri = env.MONGODB_URI): Promise<void> {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, {
    maxPoolSize: 50, // per instance; sized for ~5k concurrent users across a few instances
    serverSelectionTimeoutMS: 10_000,
  });
  logger.info({ host: mongoose.connection.host }, 'MongoDB connected');
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
