import { Router } from 'express';
import { StockMovementController } from './stock-movement.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeShopAccess } from '../../middleware/shop-access.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { listStockMovementsSchema } from './stock-movement.validation.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.get(
  '/stock-movements',
  authorizeShopAccess({ requireActive: false }),
  validate(listStockMovementsSchema),
  StockMovementController.list
);

router.get(
  '/sales-history',
  authorizeShopAccess({ requireActive: false }),
  StockMovementController.salesHistory
);

router.get(
  '/stock-history',
  authorizeShopAccess({ requireActive: false }),
  StockMovementController.stockHistory
);

export const stockMovementRouter = router;
