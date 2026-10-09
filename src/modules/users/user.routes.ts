import { Router } from 'express';
import { UserController } from './user.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import { createUserSchema, updateUserSchema, listUsersSchema } from './user.validation.js';

const router = Router();

// User management routes are restricted to ADMIN only
router.use(authenticate, authorizeRoles(UserRole.ADMIN));

router.post('/', validate(createUserSchema), UserController.create);
router.get('/', validate(listUsersSchema), UserController.list);
router.get('/:userId', UserController.getById);
router.patch('/:userId', validate(updateUserSchema), UserController.update);

export const userRouter = router;
