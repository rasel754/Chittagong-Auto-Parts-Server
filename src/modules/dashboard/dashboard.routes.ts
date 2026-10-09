import { Router } from 'express';
import { DashboardController } from './dashboard.controller.js';
import { authenticate } from '../../middleware/auth.middleware.js';
import { validate } from '../../middleware/validate.middleware.js';
import { dashboardOverviewSchema } from './dashboard.validation.js';

const router = Router();

router.use(authenticate);

// Global overview dashboard across all authorized shops
router.get('/overview', validate(dashboardOverviewSchema), DashboardController.getOverview);

export const dashboardRouter = router;
