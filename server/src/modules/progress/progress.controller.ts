import type { Request, Response } from 'express';
import { ok } from '../../lib/http';
import { userId } from '../../middleware/auth';
import * as progress from './progress.service';

export async function list(req: Request, res: Response) {
  ok(res, await progress.listProgress(userId(req)));
}

export async function update(req: Request<{ problemId: string }>, res: Response) {
  ok(res, await progress.updateProgress(userId(req), req.params.problemId, req.body, req.timeZone));
}

export async function stats(req: Request, res: Response) {
  ok(res, await progress.getStats(userId(req), req.timeZone));
}

export async function heatmap(req: Request, res: Response) {
  ok(res, await progress.getHeatmap(userId(req), req.timeZone));
}

export async function lastActive(req: Request, res: Response) {
  await progress.setLastActive(userId(req), req.body.problemId);
  ok(res, { saved: true });
}

export async function reset(req: Request, res: Response) {
  await progress.resetProgress(userId(req));
  ok(res, { reset: true });
}
