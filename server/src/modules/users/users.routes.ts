import { Router } from 'express';
import { updatePreferencesSchema } from '@dsa/shared';
import { requireAuth, userId } from '../../middleware/auth';
import { validate } from '../../middleware/validate';
import { ok } from '../../lib/http';
import { AppError } from '../../lib/errors';
import { UserModel } from '../../models';
import { toUserDTO } from './users.mapper';

export const usersRouter = Router();
usersRouter.use(requireAuth);

usersRouter.patch('/me', validate({ body: updatePreferencesSchema }), async (req, res) => {
  const { name, ...prefs } = req.body as Record<string, unknown>;
  const $set: Record<string, unknown> = {};
  if (name) $set.name = name;
  for (const [k, v] of Object.entries(prefs)) if (v !== undefined) $set[`preferences.${k}`] = v;
  const user = await UserModel.findByIdAndUpdate(
    userId(req),
    { $set },
    { returnDocument: 'after', runValidators: true },
  );
  if (!user) throw AppError.notFound('User');
  ok(res, toUserDTO(user));
});
