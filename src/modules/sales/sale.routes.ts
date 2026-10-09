import { Router } from 'express';
import { SaleController } from './sale.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeShopAccess } from '../../middleware/shop-access.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createSaleSchema,
  listSalesSchema,
  getSaleByIdSchema,
  updateSaleSchema,
  deleteSaleSchema
} from './sale.validation.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  authorizeShopAccess({ requireActive: true }),
  validate(createSaleSchema),
  SaleController.create
);

router.get(
  '/',
  authorizeShopAccess({ requireActive: false }),
  validate(listSalesSchema),
  SaleController.list
);

router.get(
  '/:saleId',
  authorizeShopAccess({ requireActive: false }),
  validate(getSaleByIdSchema),
  SaleController.getById
);

router.put(
  '/:saleId',
  authorizeShopAccess({ requireActive: true }),
  validate(updateSaleSchema),
  SaleController.update
);

router.delete(
  '/:saleId',
  authorizeShopAccess({ requireActive: true }),
  validate(deleteSaleSchema),
  SaleController.delete
);

export const saleRouter = router;

