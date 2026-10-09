import { Request, Response, NextFunction } from 'express';
import { ProductService } from './product.service.js';
import { ResponseUtil } from '../../common/response.js';

export class ProductController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.create(req.body);
      ResponseUtil.created(res, 'Product created successfully', product);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await ProductService.list(req.query);
      ResponseUtil.success(res, 'Products retrieved successfully', result.docs, 200, {
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
      const product = await ProductService.findById(req.params.productId);
      ResponseUtil.success(res, 'Product retrieved successfully', product);
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const product = await ProductService.update(req.params.productId, req.body);
      ResponseUtil.success(res, 'Product updated successfully', product);
    } catch (error) {
      next(error);
    }
  }
}
