import { Router } from 'express';
import { z } from 'zod';
import {
  createEventSchema,
  eventRangeQuerySchema,
  generatePlanSchema,
  objectId,
  updateEventSchema,
} from '@dsa/shared';
import { requireAuth } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import * as ctrl from './calendar.controller';

export const calendarRouter = Router();
calendarRouter.use(requireAuth);

const idParams = z.object({ id: objectId });

calendarRouter.get('/events', validate({ query: eventRangeQuerySchema }), ctrl.list);
calendarRouter.post('/events', validate({ body: createEventSchema }), ctrl.create);
calendarRouter.patch(
  '/events/:id',
  validate({ params: idParams, body: updateEventSchema }),
  ctrl.update,
);
calendarRouter.delete('/events/:id', validate({ params: idParams }), ctrl.remove);
calendarRouter.get('/agenda', ctrl.agenda);
calendarRouter.post('/rollover', ctrl.rollover);
calendarRouter.get('/plan', ctrl.getPlan);
calendarRouter.post('/plan', validate({ body: generatePlanSchema }), ctrl.generatePlan);
calendarRouter.delete('/plan', ctrl.deletePlan);
calendarRouter.get('/export.ics', ctrl.exportIcs);
