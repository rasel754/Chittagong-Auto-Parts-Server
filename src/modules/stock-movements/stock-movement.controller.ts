import { Request, Response, NextFunction } from 'express';
import { StockMovementService } from './stock-movement.service.js';
import { StockEntryService } from '../stock-entries/stock-entry.service.js';
import { SaleService } from '../sales/sale.service.js';
import { ResponseUtil } from '../../common/response.js';

export class StockMovementController {
  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await StockMovementService.list(req.params.shopId, req.query);
      ResponseUtil.success(res, 'Stock movements retrieved successfully', result.docs, 200, {
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

  public static async salesHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SaleService.list(req.params.shopId, req.query);
      ResponseUtil.success(res, 'Shop sales history retrieved successfully', result.docs, 200, {
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

  public static async stockHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await StockEntryService.list(req.params.shopId, req.query);
      ResponseUtil.success(res, 'Shop stock history retrieved successfully', result.docs, 200, {
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
}
