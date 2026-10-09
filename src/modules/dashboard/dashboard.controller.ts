import { Request, Response, NextFunction } from 'express';
import { DashboardService } from './dashboard.service.js';
import { ResponseUtil } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors/unauthorized.error.js';

export class DashboardController {
  public static async getOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const overview = await DashboardService.getOverview(req.user, req.query);
      ResponseUtil.success(res, 'Overview dashboard data retrieved successfully', overview);
    } catch (error) {
      next(error);
    }
  }

  public static async getShopDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const dashboard = await DashboardService.getShopDashboard(req.params.shopId, req.query);
      ResponseUtil.success(res, 'Shop dashboard data retrieved successfully', dashboard);
    } catch (error) {
      next(error);
    }
  }
}
