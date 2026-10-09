import { Request, Response, NextFunction } from 'express';
import { AuthService } from './auth.service.js';
import { ResponseUtil } from '../../common/response.js';
import { UnauthorizedError } from '../../common/errors/unauthorized.error.js';

export class AuthController {
  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await AuthService.login(req.body);
      ResponseUtil.success(res, 'Login successful', result);
    } catch (error) {
      next(error);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Authentication required');
      }
      const user = await AuthService.getMe(req.user.id);
      ResponseUtil.success(res, 'Current user profile retrieved successfully', user);
    } catch (error) {
      next(error);
    }
  }

  public static async logout(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // In JWT stateless auth, logout is acknowledged so client removes the bearer token
      ResponseUtil.success(res, 'Logout successful. Token invalidated on client.');
    } catch (error) {
      next(error);
    }
  }
}
