import { Types, Document } from 'mongoose';
import { UserRole } from '../../common/constants/roles.constant.js';
import { CommonStatus } from '../../common/constants/status.constant.js';

export interface IUser {
  name: string;
  phone: string;
  passwordHash: string;
  role: UserRole;
  permittedShopIds: Types.ObjectId[];
  status: CommonStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export interface IUserResponse {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  permittedShopIds: string[];
  status: CommonStatus;
  createdAt: Date;
  updatedAt: Date;
}
