import { Schema, model } from 'mongoose';
import { IInventoryDocument } from './inventory.interface.js';
import { MoneyUtil } from '../../common/utils/money.util.js';

const inventorySchema = new Schema<IInventoryDocument>(
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
    quantityOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Quantity on hand cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity on hand must be an integer'
      }
    },
    averageUnitCost: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Average unit cost cannot be negative']
    },
    defaultSellingRatePerPiece: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Default selling rate cannot be negative']
    },
    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, 'Low stock threshold cannot be negative']
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        ret.id = ret._id ? (ret._id as { toString(): string }).toString() : undefined;
        // Operational inventory stock valuation
        const qty = typeof ret.quantityOnHand === 'number' ? ret.quantityOnHand : 0;
        const avgCost = typeof ret.averageUnitCost === 'number' ? ret.averageUnitCost : 0;
        ret.stockValue = MoneyUtil.multiply(qty, avgCost);
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// One inventory balance per product per shop
inventorySchema.index({ shopId: 1, productId: 1 }, { unique: true });
inventorySchema.index({ shopId: 1, quantityOnHand: 1 });

export const InventoryModel = model<IInventoryDocument>('Inventory', inventorySchema);
