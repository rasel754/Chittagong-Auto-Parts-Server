import { Types, Document } from 'mongoose';
import { IShopResponse } from '../shops/shop.interface.js';
import { IProductResponse } from '../products/product.interface.js';

export interface IInventory {
  shopId: Types.ObjectId;
  productId: Types.ObjectId;
  quantityOnHand: number;
  averageUnitCost: number;
  defaultSellingRatePerPiece: number;
  lowStockThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IInventoryDocument extends IInventory, Document {}

export interface IInventoryResponse {
  id: string;
  shopId: string | IShopResponse;
  productId: string | IProductResponse;
  quantityOnHand: number;
  averageUnitCost: number;
  defaultSellingRatePerPiece: number;
  lowStockThreshold: number;
  stockValue: number;
  createdAt: Date;
  updatedAt: Date;
}
