import { Schema, model } from 'mongoose';
import { IStockEntryDocument } from './stock-entry.interface.js';

const stockEntrySchema = new Schema<IStockEntryDocument>(
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
    supplierName: {
      type: String,
      required: [true, 'Supplier name is required'],
      trim: true
    },
    quantityReceived: {
      type: Number,
      required: [true, 'Quantity received is required'],
      min: [1, 'Quantity received must be at least 1 piece'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity received must be an integer'
      }
    },
    buyingRatePerPiece: {
      type: Number,
      required: [true, 'Buying rate is required'],
      min: [0, 'Buying rate cannot be negative']
    },
    sellingRatePerPiece: {
      type: Number,
      min: [0, 'Selling rate cannot be negative']
    },
    totalPurchaseValue: {
      type: Number,
      required: [true, 'Total purchase value is required'],
      min: [0, 'Total purchase value cannot be negative']
    },
    entryDate: {
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

// Indexes for high performance querying
stockEntrySchema.index({ shopId: 1, entryDate: -1 });
stockEntrySchema.index({ shopId: 1, productId: 1, entryDate: -1 });

export const StockEntryModel = model<IStockEntryDocument>('StockEntry', stockEntrySchema);
