import { Router } from 'express';
import { InventoryController } from './inventory.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeShopAccess } from '../../middleware/shop-access.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  listInventorySchema,
  getInventoryByProductSchema,
  updateInventorySchema
} from './inventory.validation.js';

// Merge params to inherit :shopId from parent router if mounted under /shops/:shopId/inventory
const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
  '/',
  authorizeShopAccess({ requireActive: false }),
  validate(listInventorySchema),
  InventoryController.listByShop
);

router.get(
  '/:productId',
  authorizeShopAccess({ requireActive: false }),
  validate(getInventoryByProductSchema),
  InventoryController.getByProduct
);

router.patch(
  '/:productId',
  authorizeShopAccess({ requireActive: true }),
  validate(updateInventorySchema),
  InventoryController.update
);

export const inventoryRouter = router;
