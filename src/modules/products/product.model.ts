import { Schema, model } from 'mongoose';
import { IProductDocument } from './product.interface.js';

const productSchema = new Schema<IProductDocument>(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    normalizedName: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true
    },
    sku: {
      type: String,
      trim: true,
      sparse: true,
      unique: true,
      index: true
    },
    description: {
      type: String,
      trim: true
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

productSchema.index({ normalizedName: 'text', description: 'text', sku: 'text' });

export const ProductModel = model<IProductDocument>('Product', productSchema);
