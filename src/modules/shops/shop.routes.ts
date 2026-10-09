import { Router } from 'express';
import { ShopController } from './shop.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import {
  createShopSchema,
  updateShopSchema,
  updateShopStatusSchema,
  listShopsSchema
} from './shop.validation.js';

const router = Router();

// Authentication required for all shop routes
router.use(authenticate);

// List & view shops (accessible to authenticated users, filtered by role/permissions)
router.get('/', validate(listShopsSchema), ShopController.list);
router.get('/:shopId', ShopController.getById);

// Admin-only mutation routes
router.post('/', authorizeRoles(UserRole.ADMIN), validate(createShopSchema), ShopController.create);
router.patch('/:shopId', authorizeRoles(UserRole.ADMIN), validate(updateShopSchema), ShopController.update);
router.patch('/:shopId/status', authorizeRoles(UserRole.ADMIN), validate(updateShopStatusSchema), ShopController.updateStatus);

export const shopRouter = router;
