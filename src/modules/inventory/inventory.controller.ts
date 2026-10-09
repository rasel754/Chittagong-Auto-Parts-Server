import { Request, Response, NextFunction } from 'express';
import { InventoryService } from './inventory.service.js';
import { ResponseUtil } from '../../common/response.js';

export class InventoryController {
  public static async listByShop(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await InventoryService.listByShop(req.params.shopId, req.query);
      ResponseUtil.success(res, 'Shop inventory retrieved successfully', result.docs, 200, {
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

  public static async getByProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inventory = await InventoryService.getByProduct(req.params.shopId, req.params.productId);
      ResponseUtil.success(res, 'Product inventory retrieved successfully', inventory);
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const inventory = await InventoryService.update(req.params.shopId, req.params.productId, req.body);
      ResponseUtil.success(res, 'Product inventory updated successfully', inventory);
    } catch (error) {
      next(error);
    }
  }
}
