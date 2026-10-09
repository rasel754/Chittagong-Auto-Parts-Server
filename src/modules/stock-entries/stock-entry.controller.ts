import { Request, Response, NextFunction } from 'express';
import { StockEntryService } from './stock-entry.service.js';
import { ResponseUtil } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors/unauthorized.error.js';

export class StockEntryController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const entry = await StockEntryService.create(req.params.shopId, req.user.id, req.body);
      ResponseUtil.created(res, 'Stock entry recorded successfully', entry);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await StockEntryService.list(req.params.shopId, req.query);
      ResponseUtil.success(res, 'Stock entries retrieved successfully', result.docs, 200, {
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
      const entry = await StockEntryService.getById(req.params.shopId, req.params.entryId);
      ResponseUtil.success(res, 'Stock entry retrieved successfully', entry);
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const entry = await StockEntryService.update(req.params.shopId, req.params.entryId, req.user.id, req.body);
      ResponseUtil.success(res, 'Stock entry updated successfully', entry);
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await StockEntryService.delete(req.params.shopId, req.params.entryId);
      ResponseUtil.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }
}
