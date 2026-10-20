import { Router } from 'express';
import { ok } from '../../lib/http';
import { getSheet } from './sheet.service';

export const sheetRouter = Router();

/** Public & cacheable: content is the same for every student. Per-user data lives in /progress. */
sheetRouter.get('/', async (req, res) => {
  const { sheet, etag } = await getSheet();
  res.setHeader('ETag', etag);
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  if (req.headers['if-none-match'] === etag) return res.status(304).end();
  ok(res, sheet);
});
