import { Schema, model } from 'mongoose';
import { IShopDocument } from './shop.interface.js';
import { CommonStatus } from '../../common/constants/status.constant.js';

const shopSchema = new Schema<IShopDocument>(
  {
    name: {
      type: String,
      required: [true, 'Shop name is required'],
      trim: true
    },
    code: {
      type: String,
      required: [true, 'Shop code is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true
    },
    address: {
      type: String,
      trim: true
    },
    phone: {
      type: String,
      trim: true
    },
    status: {
      type: String,
      enum: Object.values(CommonStatus),
      default: CommonStatus.ACTIVE,
      required: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id ? (ret._id as { toString(): string }).toString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const ShopModel = model<IShopDocument>('Shop', shopSchema);
