import { Router } from 'express';
import { StockEntryController } from './stock-entry.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { authorizeShopAccess } from '../../middleware/shop-access.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import {
  createStockEntrySchema,
  listStockEntriesSchema,
  getStockEntryByIdSchema,
  updateStockEntrySchema,
  deleteStockEntrySchema
} from './stock-entry.validation.js';

const router = Router({ mergeParams: true });

router.use(authenticate);

router.post(
  '/',
  authorizeShopAccess({ requireActive: true }),
  validate(createStockEntrySchema),
  StockEntryController.create
);

router.get(
  '/',
  authorizeShopAccess({ requireActive: false }),
  validate(listStockEntriesSchema),
  StockEntryController.list
);

router.get(
  '/:entryId',
  authorizeShopAccess({ requireActive: false }),
  validate(getStockEntryByIdSchema),
  StockEntryController.getById
);

router.put(
  '/:entryId',
  authorizeShopAccess({ requireActive: true }),
  validate(updateStockEntrySchema),
  StockEntryController.update
);

router.delete(
  '/:entryId',
  authorizeShopAccess({ requireActive: true }),
  validate(deleteStockEntrySchema),
  StockEntryController.delete
);

export const stockEntryRouter = router;

