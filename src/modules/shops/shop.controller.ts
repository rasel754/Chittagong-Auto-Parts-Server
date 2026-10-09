import { Request, Response, NextFunction } from 'express';
import { ShopService } from './shop.service.js';
import { ResponseUtil } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors/unauthorized.error.js';

export class ShopController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shop = await ShopService.create(req.body);
      ResponseUtil.created(res, 'Shop created successfully', shop);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const result = await ShopService.list(req.user, req.query);
      ResponseUtil.success(res, 'Shops retrieved successfully', result.docs, 200, {
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
        hasNextPage: result.hasNextPage,
        hasPrevPage: result.hasPrevPage
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const shop = await ShopService.getByIdOrCode(req.params.shopId, req.user);
      ResponseUtil.success(res, 'Shop retrieved successfully', shop);
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shop = await ShopService.update(req.params.shopId, req.body);
      ResponseUtil.success(res, 'Shop updated successfully', shop);
    } catch (error) {
      next(error);
    }
  }

  public static async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const shop = await ShopService.updateStatus(req.params.shopId, req.body.status);
      ResponseUtil.success(res, 'Shop status updated successfully', shop);
    } catch (error) {
      next(error);
    }
  }
}
