import { Types, Document } from 'mongoose';
import { IShopResponse } from '../shops/shop.interface.js';
import { IProductResponse } from '../products/product.interface.js';
import { IUserResponse } from '../users/user.interface.js';

export interface IStockEntry {
  shopId: Types.ObjectId;
  productId: Types.ObjectId;
  supplierName: string;
  quantityReceived: number;
  buyingRatePerPiece: number;
  sellingRatePerPiece?: number;
  totalPurchaseValue: number;
  entryDate: Date;
  notes?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IStockEntryDocument extends IStockEntry, Document {}

export interface IStockEntryResponse {
  id: string;
  shopId: string | IShopResponse;
  productId: string | IProductResponse;
  supplierName: string;
  quantityReceived: number;
  buyingRatePerPiece: number;
  sellingRatePerPiece?: number;
  totalPurchaseValue: number;
  entryDate: Date;
  notes?: string;
  createdBy: string | IUserResponse;
  createdAt: Date;
  updatedAt: Date;
}
