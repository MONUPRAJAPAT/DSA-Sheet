import { Router } from 'express';
import { loginSchema, registerSchema } from '@dsa/shared';
import { validate } from '../../middleware/validate';
import { requireAuth } from '../../middleware/auth';
import { demoLimiter, loginLimiter, registerLimiter } from '../../middleware/rateLimit';
import * as ctrl from './auth.controller';

export const authRouter = Router();

authRouter.post('/register', registerLimiter, validate({ body: registerSchema }), ctrl.register);
authRouter.post('/login', loginLimiter, validate({ body: loginSchema }), ctrl.login);
authRouter.post('/demo', demoLimiter, ctrl.demo);
authRouter.post('/refresh', ctrl.refresh);
authRouter.post('/logout', ctrl.logout);
authRouter.post('/logout-all', requireAuth, ctrl.logoutAll);
authRouter.get('/me', requireAuth, ctrl.me);
