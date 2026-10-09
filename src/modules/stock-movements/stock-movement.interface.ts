import { Types, Document } from 'mongoose';
import { MovementType, ReferenceType } from '../../common/constants/movement-types.constant.js';
import { IShopResponse } from '../shops/shop.interface.js';
import { IProductResponse } from '../products/product.interface.js';
import { IUserResponse } from '../users/user.interface.js';

export interface IStockMovement {
  shopId: Types.ObjectId;
  productId: Types.ObjectId;
  movementType: MovementType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType: ReferenceType;
  referenceId: Types.ObjectId;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStockMovementDocument extends IStockMovement, Document {}

export interface IStockMovementResponse {
  id: string;
  shopId: string | IShopResponse;
  productId: string | IProductResponse;
  movementType: MovementType;
  quantityChange: number;
  quantityBefore: number;
  quantityAfter: number;
  referenceType: ReferenceType;
  referenceId: string;
  notes?: string;
  createdBy: string | IUserResponse;
  createdAt: Date;
  updatedAt: Date;
}
