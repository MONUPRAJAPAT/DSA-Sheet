import { Router } from 'express';
import mongoose from 'mongoose';

export const healthRouter = Router();

/** Used by the ALB target group health check and uptime monitoring. */
healthRouter.get('/', (_req, res) => {
  const dbUp = mongoose.connection.readyState === 1;
  res.status(dbUp ? 200 : 503).json({
    status: dbUp ? 'ok' : 'degraded',
    db: dbUp ? 'up' : 'down',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});
