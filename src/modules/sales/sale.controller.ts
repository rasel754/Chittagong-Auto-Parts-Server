import { Request, Response, NextFunction } from 'express';
import { SaleService } from './sale.service.js';
import { ResponseUtil } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors/unauthorized.error.js';

export class SaleController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const sale = await SaleService.create(req.params.shopId, req.user.id, req.body);
      ResponseUtil.created(res, 'Sale recorded successfully', sale);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SaleService.list(req.params.shopId, req.query);
      ResponseUtil.success(res, 'Sales retrieved successfully', result.docs, 200, {
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
      const sale = await SaleService.getById(req.params.shopId, req.params.saleId);
      ResponseUtil.success(res, 'Sale retrieved successfully', sale);
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) throw new UnauthorizedError('Authentication required');
      const sale = await SaleService.update(req.params.shopId, req.params.saleId, req.user.id, req.body);
      ResponseUtil.success(res, 'Sale updated successfully', sale);
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await SaleService.delete(req.params.shopId, req.params.saleId);
      ResponseUtil.success(res, result.message, null);
    } catch (error) {
      next(error);
    }
  }
}
