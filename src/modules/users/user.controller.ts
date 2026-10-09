import { Request, Response, NextFunction } from 'express';
import { UserService } from './user.service.js';
import { ResponseUtil } from '../../common/response.js';

export class UserController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.create(req.body);
      ResponseUtil.created(res, 'User created successfully', user);
    } catch (error) {
      next(error);
    }
  }

  public static async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await UserService.list(req.query);
      ResponseUtil.success(res, 'Users retrieved successfully', result.docs, 200, {
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
      const user = await UserService.findById(req.params.userId);
      ResponseUtil.success(res, 'User retrieved successfully', user);
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await UserService.update(req.params.userId, req.body);
      ResponseUtil.success(res, 'User updated successfully', user);
    } catch (error) {
      next(error);
    }
  }
}
