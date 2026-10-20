import type { RequestHandler } from 'express';
import { isValidTimeZone } from '../lib/dates';

export const timezone: RequestHandler = (req, _res, next) => {
  const tz = req.header('x-timezone');
  req.timeZone = tz && isValidTimeZone(tz) ? tz : 'UTC';
  next();
};
