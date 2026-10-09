import { Schema, model } from 'mongoose';
import { ISaleDocument } from './sale.interface.js';

const saleSchema = new Schema<ISaleDocument>(
  {
    shopId: {
      type: Schema.Types.ObjectId,
      ref: 'Shop',
      required: [true, 'Shop ID is required'],
      index: true
    },
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: [true, 'Product ID is required'],
      index: true
    },
    quantitySold: {
      type: Number,
      required: [true, 'Quantity sold is required'],
      min: [1, 'Quantity sold must be at least 1 piece'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity sold must be an integer'
      }
    },
    sellingRatePerPiece: {
      type: Number,
      required: [true, 'Selling rate is required'],
      min: [0, 'Selling rate cannot be negative']
    },
    totalSellingPrice: {
      type: Number,
      required: [true, 'Total selling price is required'],
      min: [0, 'Total selling price cannot be negative']
    },
    unitCostAtSale: {
      type: Number,
      required: [true, 'Unit cost at sale is required'],
      min: [0, 'Unit cost cannot be negative']
    },
    costOfGoodsSold: {
      type: Number,
      required: [true, 'Cost of goods sold is required'],
      min: [0, 'Cost of goods sold cannot be negative']
    },
    grossProfit: {
      type: Number,
      required: [true, 'Gross profit is required']
    },
    saleDate: {
      type: Date,
      default: Date.now,
      index: true
    },
    notes: {
      type: String,
      trim: true
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Created by user ID is required']
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

// Indexes for sales queries and dashboards
saleSchema.index({ shopId: 1, saleDate: -1 });
saleSchema.index({ shopId: 1, productId: 1, saleDate: -1 });

export const SaleModel = model<ISaleDocument>('Sale', saleSchema);
