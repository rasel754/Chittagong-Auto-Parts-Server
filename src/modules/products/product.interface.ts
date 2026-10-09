import { Document } from 'mongoose';

export interface IProduct {
  name: string;
  normalizedName: string;
  sku?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProductDocument extends IProduct, Document {}

export interface IProductResponse {
  id: string;
  name: string;
  normalizedName: string;
  sku?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
