import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { AppError } from '../../lib/errors';
import { userId } from '../../middleware/auth';
import * as calendar from './calendar.service';

type IdParams = { id: string };

export async function list(req: Request, res: Response) {
  const { from, to } = req.validatedQuery as { from: string; to: string };
  ok(res, await calendar.listEvents(userId(req), from, to, req.timeZone));
}

export async function agenda(req: Request, res: Response) {
  ok(res, await calendar.getAgenda(userId(req), req.timeZone));
}

export async function create(req: Request, res: Response) {
  ok(res, await calendar.createEvent(userId(req), req.body, req.timeZone), 201);
}

export async function update(req: Request<IdParams>, res: Response) {
  ok(res, await calendar.updateEvent(userId(req), req.params.id, req.body, req.timeZone));
}

export async function remove(req: Request<IdParams>, res: Response) {
  await calendar.deleteEvent(userId(req), req.params.id);
  ok(res, { deleted: true });
}

export async function rollover(req: Request, res: Response) {
  ok(res, await calendar.rolloverOverdue(userId(req), req.timeZone));
}

export async function getPlan(req: Request, res: Response) {
  const plan = await calendar.getPlan(userId(req));
  if (!plan) throw AppError.notFound('Study plan');
  ok(res, plan);
}

export async function generatePlan(req: Request, res: Response) {
  ok(res, await calendar.generatePlan(userId(req), req.body), 201);
}

export async function deletePlan(req: Request, res: Response) {
  await calendar.deletePlan(userId(req));
  ok(res, { deleted: true });
}

export async function exportIcs(req: Request, res: Response) {
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="dsa-study-plan.ics"');
  res.send(await calendar.exportIcs(userId(req)));
}
