import { Types, Document } from 'mongoose';
import { IShopResponse } from '../shops/shop.interface.js';
import { IProductResponse } from '../products/product.interface.js';
import { IUserResponse } from '../users/user.interface.js';

export interface ISale {
  shopId: Types.ObjectId;
  productId: Types.ObjectId;
  quantitySold: number;
  sellingRatePerPiece: number;
  totalSellingPrice: number;
  unitCostAtSale: number;
  costOfGoodsSold: number;
  grossProfit: number;
  saleDate: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ISaleDocument extends ISale, Document {}

export interface ISaleResponse {
  id: string;
  shopId: string | IShopResponse;
  productId: string | IProductResponse;
  quantitySold: number;
  sellingRatePerPiece: number;
  totalSellingPrice: number;
  unitCostAtSale: number;
  costOfGoodsSold: number;
  grossProfit: number;
  saleDate: Date;
  notes?: string;
  createdBy: string | IUserResponse;
  createdAt: Date;
  updatedAt: Date;
}
