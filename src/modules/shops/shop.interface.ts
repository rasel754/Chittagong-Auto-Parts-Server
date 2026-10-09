import { Document } from 'mongoose';
import { CommonStatus } from '../../common/constants/status.constant.js';

export interface IShop {
  name: string;
  code: string; // Unique normalized slug, e.g. "chittagong-shop", "dhaka-shop"
  address?: string;
  phone?: string;
  status: CommonStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IShopDocument extends IShop, Document {}

export interface IShopResponse {
  id: string;
  name: string;
  code: string;
  address?: string;
  phone?: string;
  status: CommonStatus;
  createdAt: Date;
  updatedAt: Date;
}
