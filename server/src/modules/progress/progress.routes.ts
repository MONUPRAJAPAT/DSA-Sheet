import { Router } from 'express';
import { z } from 'zod';
import { lastActiveSchema, objectId, updateProgressSchema } from '@dsa/shared';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as ctrl from './progress.controller';

export const progressRouter = Router();
progressRouter.use(requireAuth);

progressRouter.get('/', ctrl.list);
progressRouter.get('/stats', ctrl.stats);
progressRouter.get('/heatmap', ctrl.heatmap);
progressRouter.post('/last-active', validate({ body: lastActiveSchema }), ctrl.lastActive);
progressRouter.delete('/', ctrl.reset);
progressRouter.put(
  '/:problemId',
  validate({ params: z.object({ problemId: objectId }), body: updateProgressSchema }),
  ctrl.update,
);
