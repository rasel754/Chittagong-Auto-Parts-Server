import { Router } from 'express';
import { authRouter } from '../modules/auth/auth.routes.js';
import { userRouter } from '../modules/users/user.routes.js';
import { shopRouter } from '../modules/shops/shop.routes.js';
import { productRouter } from '../modules/products/product.routes.js';
import { inventoryRouter } from '../modules/inventory/inventory.routes.js';
import { stockEntryRouter } from '../modules/stock-entries/stock-entry.routes.js';
import { saleRouter } from '../modules/sales/sale.routes.js';
import { stockMovementRouter } from '../modules/stock-movements/stock-movement.routes.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js';
import { DashboardController } from '../modules/dashboard/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { authorizeShopAccess } from '../middleware/shop-access.middleware.js';
import { validate } from '../middleware/validate.middleware.js';
import { shopDashboardSchema } from '../modules/dashboard/dashboard.validation.js';

const apiRouter = Router();

// Top-level resource routes
apiRouter.use('/auth', authRouter);
apiRouter.use('/users', userRouter);
apiRouter.use('/shops', shopRouter);
apiRouter.use('/products', productRouter);
apiRouter.use('/dashboard', dashboardRouter);

// Shop-scoped sub-resource routes
apiRouter.use('/shops/:shopId/inventory', inventoryRouter);
apiRouter.use('/shops/:shopId/products', inventoryRouter); // alias for products inventory in shop
apiRouter.use('/shops/:shopId/stock-entries', stockEntryRouter);
apiRouter.use('/shops/:shopId/sales', saleRouter);
apiRouter.use('/shops/:shopId', stockMovementRouter);

// Shop-scoped dashboard route
apiRouter.get(
  '/shops/:shopId/dashboard',
  authenticate,
  authorizeShopAccess({ requireActive: false }),
  validate(shopDashboardSchema),
  DashboardController.getShopDashboard
);

export { apiRouter };
