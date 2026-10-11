import { Router } from 'express';
import { AuthController } from './auth.controller.js';
import { validate } from '../../middleware/validate.middleware.js';
import { loginSchema } from './auth.validation.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authRateLimiter } from '../../middleware/rate-limiter.middleware.js';

const router = Router();

router.get('/ping', (_req, res) => res.json({ success: true, message: 'pong' }));
router.post('/login', authRateLimiter, validate(loginSchema), AuthController.login);
router.get('/me', authenticate, AuthController.getMe);
router.post('/logout', authenticate, AuthController.logout);

export const authRouter = router;
