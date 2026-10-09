import { Schema, model } from 'mongoose';
import { IStockMovementDocument } from './stock-movement.interface.js';
import { MovementType, ReferenceType } from '../../common/constants/movement-types.constant.js';

const stockMovementSchema = new Schema<IStockMovementDocument>(
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
    movementType: {
      type: String,
      enum: Object.values(MovementType),
      required: true,
      index: true
    },
    quantityChange: {
      type: Number,
      required: [true, 'Quantity change is required'],
      validate: {
        validator: (v: number) => Number.isInteger(v) && v !== 0,
        message: 'Quantity change must be a non-zero integer'
      }
    },
    quantityBefore: {
      type: Number,
      required: [true, 'Quantity before is required'],
      min: [0, 'Quantity before cannot be negative']
    },
    quantityAfter: {
      type: Number,
      required: [true, 'Quantity after is required'],
      min: [0, 'Quantity after cannot be negative']
    },
    referenceType: {
      type: String,
      enum: Object.values(ReferenceType),
      required: true,
      index: true
    },
    referenceId: {
      type: Schema.Types.ObjectId,
      required: [true, 'Reference ID is required'],
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

// Indexes for history filtering
stockMovementSchema.index({ shopId: 1, createdAt: -1 });
stockMovementSchema.index({ shopId: 1, productId: 1, createdAt: -1 });
stockMovementSchema.index({ referenceType: 1, referenceId: 1 });

export const StockMovementModel = model<IStockMovementDocument>(
  'StockMovement',
  stockMovementSchema
);
