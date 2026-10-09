import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { ForbiddenError } from '../common/errors/forbidden.error.js';
import { NotFoundError } from '../common/errors/not-found.error.js';
import { BadRequestError } from '../common/errors/bad-request.error.js';
import { UserRole } from '../common/constants/roles.constant.js';
import { CommonStatus } from '../common/constants/status.constant.js';
import { ShopModel } from '../modules/shops/shop.model.js';
import { IShopDocument } from '../modules/shops/shop.interface.js';

declare global {
  namespace Express {
    interface Request {
      shop?: IShopDocument;
    }
  }
}

interface ShopAccessOptions {
  requireActive?: boolean;
}

export function authorizeShopAccess(options: ShopAccessOptions = { requireActive: true }) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const shopIdOrCode = req.params.shopId;
      if (!shopIdOrCode) {
        return next(new BadRequestError('Shop parameter is required'));
      }

      let shop: IShopDocument | null = null;
      if (Types.ObjectId.isValid(shopIdOrCode)) {
        shop = await ShopModel.findById(shopIdOrCode);
      } else {
        shop = await ShopModel.findOne({ code: shopIdOrCode.toLowerCase() });
      }

      if (!shop) {
        return next(new NotFoundError(`Shop '${shopIdOrCode}' not found`));
      }

      // Check role authorization
      const user = req.user;
      if (!user) {
        return next(new ForbiddenError('Authentication required'));
      }

      if (user.role !== UserRole.ADMIN) {
        const shopIdStr = shop._id.toString();
        const hasPermission = user.permittedShopIds.includes(shopIdStr);
        if (!hasPermission) {
          return next(
            new ForbiddenError(
              `You do not have permission to access shop '${shop.name}' (${shop.code})`
            )
          );
        }
      }

      // Check if active
      if (options.requireActive && shop.status === CommonStatus.INACTIVE) {
        return next(
          new BadRequestError(
            `Shop '${shop.name}' is currently inactive and cannot process transactions`
          )
        );
      }

      req.shop = shop;
      // Normalize req.params.shopId to actual ObjectId string
      req.params.shopId = shop._id.toString();

      next();
    } catch (error) {
      next(error);
    }
  };
}
