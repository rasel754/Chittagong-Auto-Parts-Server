import { Types } from 'mongoose';
import { StockEntryModel } from './stock-entry.model.js';
import { InventoryModel } from '../inventory/inventory.model.js';
import { ProductModel } from '../products/product.model.js';
import { StockMovementModel } from '../stock-movements/stock-movement.model.js';
import { MoneyUtil } from '../../common/utils/money.util.js';
import { withTransaction } from '../../common/utils/transaction.util.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { BadRequestError } from '../../common/errors/bad-request.error.js';
import { MovementType, ReferenceType } from '../../common/constants/movement-types.constant.js';
import { PaginationUtil, PaginatedResult } from '../../common/pagination.js';
import { IStockEntryResponse } from './stock-entry.interface.js';
import { CreateStockEntryInput, UpdateStockEntryInput } from './stock-entry.validation.js';

export interface ListStockEntriesQuery {
  page?: string;
  limit?: string;
  productId?: string;
  supplierName?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

export class StockEntryService {
  public static async create(
    shopId: string,
    userId: string,
    input: CreateStockEntryInput
  ): Promise<IStockEntryResponse> {
    const totalPurchaseValue = MoneyUtil.multiply(
      input.quantityReceived,
      input.buyingRatePerPiece
    );

    return await withTransaction(async (session) => {
      // 1. Resolve product identity
      let product = null;
      if (input.productId && Types.ObjectId.isValid(input.productId)) {
        product = await ProductModel.findById(input.productId).session(session || null);
      }

      if (!product && input.productId) {
        product = await ProductModel.findOne({ sku: input.productId }).session(session || null);
      }

      // Inline product creation fallback if name provided
      if (!product) {
        if (input.productName) {
          const created = await ProductModel.create(
            [
              {
                name: input.productName.trim(),
                normalizedName: input.productName.trim().toLowerCase(),
                sku: input.productSku?.trim() || undefined
              }
            ],
            { session: session || undefined }
          );
          product = created[0];
        } else {
          throw new NotFoundError(`Product '${input.productId}' not found`);
        }
      }

      const productObjectId = product._id as Types.ObjectId;
      const shopObjectId = new Types.ObjectId(shopId);
      const userObjectId = new Types.ObjectId(userId);

      // 2. Fetch or create shop inventory balance
      let inventory = await InventoryModel.findOne({
        shopId: shopObjectId,
        productId: productObjectId
      }).session(session || null);

      const quantityBefore = inventory ? inventory.quantityOnHand : 0;
      const currentAvgCost = inventory ? inventory.averageUnitCost : 0;

      // 3. Compute new weighted-average unit cost
      const newAverageUnitCost = MoneyUtil.calculateWeightedAverageCost(
        quantityBefore,
        currentAvgCost,
        input.quantityReceived,
        input.buyingRatePerPiece
      );

      const quantityAfter = quantityBefore + input.quantityReceived;

      // 4. Update or create Inventory document
      if (!inventory) {
        const createdInv = await InventoryModel.create(
          [
            {
              shopId: shopObjectId,
              productId: productObjectId,
              quantityOnHand: quantityAfter,
              averageUnitCost: newAverageUnitCost,
              defaultSellingRatePerPiece:
                input.sellingRatePerPiece !== undefined
                  ? input.sellingRatePerPiece
                  : MoneyUtil.round(input.buyingRatePerPiece * 1.2), // reasonable default margin if unset
              lowStockThreshold: 5
            }
          ],
          { session: session || undefined }
        );
        inventory = createdInv[0];
      } else {
        inventory.quantityOnHand = quantityAfter;
        inventory.averageUnitCost = newAverageUnitCost;
        if (input.sellingRatePerPiece !== undefined) {
          inventory.defaultSellingRatePerPiece = input.sellingRatePerPiece;
        }
        await inventory.save({ session: session || undefined });
      }

      // 5. Create StockEntry record
      const parsedEntryDate = input.entryDate ? new Date(input.entryDate) : new Date();
      const stockEntries = await StockEntryModel.create(
        [
          {
            shopId: shopObjectId,
            productId: productObjectId,
            supplierName: input.supplierName.trim(),
            quantityReceived: input.quantityReceived,
            buyingRatePerPiece: input.buyingRatePerPiece,
            sellingRatePerPiece: input.sellingRatePerPiece,
            totalPurchaseValue,
            entryDate: isNaN(parsedEntryDate.getTime()) ? new Date() : parsedEntryDate,
            notes: input.notes?.trim(),
            createdBy: userObjectId
          }
        ],
        { session: session || undefined }
      );

      const stockEntry = stockEntries[0];

      // 6. Create immutable StockMovement history record
      await StockMovementModel.create(
        [
          {
            shopId: shopObjectId,
            productId: productObjectId,
            movementType: MovementType.STOCK_IN,
            quantityChange: input.quantityReceived,
            quantityBefore,
            quantityAfter,
            referenceType: ReferenceType.STOCK_ENTRY,
            referenceId: stockEntry._id,
            notes: `Stock purchase from ${input.supplierName.trim()}`,
            createdBy: userObjectId
          }
        ],
        { session: session || undefined }
      );

      // Populate response
      const populated = await StockEntryModel.findById(stockEntry._id)
        .populate('productId', 'name normalizedName sku')
        .populate('shopId', 'name code')
        .populate('createdBy', 'name phone')
        .session(session || null);

      return populated!.toJSON() as unknown as IStockEntryResponse;
    });
  }

  public static async list(
    shopId: string,
    query: ListStockEntriesQuery
  ): Promise<PaginatedResult<IStockEntryResponse>> {
    const pagination = PaginationUtil.parse(
      query,
      ['entryDate', 'createdAt', 'totalPurchaseValue', 'quantityReceived'],
      'entryDate'
    );

    const filter: Record<string, unknown> = {
      shopId: new Types.ObjectId(shopId)
    };

    if (query.productId && Types.ObjectId.isValid(query.productId)) {
      filter.productId = new Types.ObjectId(query.productId);
    }

    if (query.supplierName) {
      filter.supplierName = new RegExp(query.supplierName.trim(), 'i');
    }

    if (query.startDate || query.endDate) {
      filter.entryDate = {};
      if (query.startDate) {
        (filter.entryDate as Record<string, unknown>).$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (filter.entryDate as Record<string, unknown>).$lte = new Date(query.endDate);
      }
    }

    const [docs, total] = await Promise.all([
      StockEntryModel.find(filter)
        .populate('productId', 'name normalizedName sku')
        .populate('shopId', 'name code')
        .populate('createdBy', 'name phone')
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit),
      StockEntryModel.countDocuments(filter)
    ]);

    const formattedDocs = docs.map((doc) => doc.toJSON() as unknown as IStockEntryResponse);
    return PaginationUtil.format(formattedDocs, total, pagination);
  }

  public static async getById(
    shopId: string,
    entryId: string
  ): Promise<IStockEntryResponse> {
    const entry = await StockEntryModel.findOne({
      _id: new Types.ObjectId(entryId),
      shopId: new Types.ObjectId(shopId)
    })
      .populate('productId', 'name normalizedName sku description')
      .populate('shopId', 'name code')
      .populate('createdBy', 'name phone');

    if (!entry) {
      throw new NotFoundError(`Stock entry '${entryId}' not found`);
    }

    return entry.toJSON() as unknown as IStockEntryResponse;
  }

  public static async update(
    shopId: string,
    entryId: string,
    _userId: string,
    input: UpdateStockEntryInput
  ): Promise<IStockEntryResponse> {
    return await withTransaction(async (session) => {
      const entry = await StockEntryModel.findOne({
        _id: new Types.ObjectId(entryId),
        shopId: new Types.ObjectId(shopId)
      }).session(session || null);

      if (!entry) {
        throw new NotFoundError(`Stock entry '${entryId}' not found`);
      }

      const shopObjectId = new Types.ObjectId(shopId);
      const productObjectId = entry.productId as Types.ObjectId;

      const oldQty = entry.quantityReceived;
      const newQty = input.quantityReceived !== undefined ? input.quantityReceived : oldQty;
      const qtyDelta = newQty - oldQty;

      const newBuyingRate = input.buyingRatePerPiece !== undefined ? input.buyingRatePerPiece : entry.buyingRatePerPiece;
      const newSellingRate = input.sellingRatePerPiece !== undefined ? input.sellingRatePerPiece : entry.sellingRatePerPiece;

      // Update inventory balance
      const inventory = await InventoryModel.findOne({
        shopId: shopObjectId,
        productId: productObjectId
      }).session(session || null);

      if (inventory) {
        const updatedQty = inventory.quantityOnHand + qtyDelta;
        if (updatedQty < 0) {
          throw new BadRequestError('Cannot reduce stock entry quantity below currently consumed stock');
        }
        inventory.quantityOnHand = updatedQty;
        if (newSellingRate !== undefined) {
          inventory.defaultSellingRatePerPiece = newSellingRate;
        }
        await inventory.save({ session: session || undefined });
      }

      // Update product name/sku if provided
      if (input.productName) {
        await ProductModel.findByIdAndUpdate(
          productObjectId,
          {
            name: input.productName.trim(),
            normalizedName: input.productName.trim().toLowerCase(),
            ...(input.productSku !== undefined ? { sku: input.productSku.trim() || undefined } : {})
          },
          { session: session || undefined }
        );
      }

      // Update stock entry fields
      entry.quantityReceived = newQty;
      entry.buyingRatePerPiece = newBuyingRate;
      if (newSellingRate !== undefined) entry.sellingRatePerPiece = newSellingRate;
      entry.totalPurchaseValue = MoneyUtil.multiply(newQty, newBuyingRate);
      if (input.supplierName) entry.supplierName = input.supplierName.trim();
      if (input.entryDate) {
        const parsedDate = new Date(input.entryDate);
        if (!isNaN(parsedDate.getTime())) entry.entryDate = parsedDate;
      }
      if (input.notes !== undefined) entry.notes = input.notes.trim();

      await entry.save({ session: session || undefined });

      // Update movement record if exists
      await StockMovementModel.findOneAndUpdate(
        {
          shopId: shopObjectId,
          referenceType: ReferenceType.STOCK_ENTRY,
          referenceId: entry._id
        },
        {
          quantityChange: newQty,
          notes: `Stock purchase updated from ${entry.supplierName}`
        },
        { session: session || undefined }
      );

      const populated = await StockEntryModel.findById(entry._id)
        .populate('productId', 'name normalizedName sku')
        .populate('shopId', 'name code')
        .populate('createdBy', 'name phone')
        .session(session || null);

      return populated!.toJSON() as unknown as IStockEntryResponse;
    });
  }

  public static async delete(shopId: string, entryId: string): Promise<{ success: boolean; message: string }> {
    return await withTransaction(async (session) => {
      const entry = await StockEntryModel.findOne({
        _id: new Types.ObjectId(entryId),
        shopId: new Types.ObjectId(shopId)
      }).session(session || null);

      if (!entry) {
        throw new NotFoundError(`Stock entry '${entryId}' not found`);
      }

      const shopObjectId = new Types.ObjectId(shopId);
      const productObjectId = entry.productId as Types.ObjectId;

      // Adjust inventory
      const inventory = await InventoryModel.findOne({
        shopId: shopObjectId,
        productId: productObjectId
      }).session(session || null);

      if (inventory) {
        inventory.quantityOnHand = Math.max(0, inventory.quantityOnHand - entry.quantityReceived);
        await inventory.save({ session: session || undefined });
      }

      // Remove stock movement
      await StockMovementModel.deleteMany(
        {
          shopId: shopObjectId,
          referenceType: ReferenceType.STOCK_ENTRY,
          referenceId: entry._id
        },
        { session: session || undefined }
      );

      // Remove stock entry
      await StockEntryModel.findByIdAndDelete(entry._id, { session: session || undefined });

      return { success: true, message: 'Stock entry deleted successfully' };
    });
  }
}
