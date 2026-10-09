import { Types } from 'mongoose';
import { SaleModel } from './sale.model.js';
import { InventoryModel } from '../inventory/inventory.model.js';
import { ProductModel } from '../products/product.model.js';
import { StockMovementModel } from '../stock-movements/stock-movement.model.js';
import { MoneyUtil } from '../../common/utils/money.util.js';
import { withTransaction } from '../../common/utils/transaction.util.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { BadRequestError } from '../../common/errors/bad-request.error.js';
import { MovementType, ReferenceType } from '../../common/constants/movement-types.constant.js';
import { PaginationUtil, PaginatedResult } from '../../common/pagination.js';
import { ISaleResponse } from './sale.interface.js';
import { CreateSaleInput, UpdateSaleInput } from './sale.validation.js';

export interface ListSalesQuery {
  page?: string;
  limit?: string;
  productId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

export class SaleService {
  public static async create(
    shopId: string,
    userId: string,
    input: CreateSaleInput
  ): Promise<ISaleResponse> {
    return await withTransaction(async (session) => {
      // 1. Resolve product identity
      let product = null;
      if (Types.ObjectId.isValid(input.productId)) {
        product = await ProductModel.findById(input.productId).session(session || null);
      }

      if (!product && input.productId) {
        product = await ProductModel.findOne({ sku: input.productId }).session(session || null);
      }

      if (!product) {
        throw new NotFoundError(`Product '${input.productId}' not found`);
      }

      const productObjectId = product._id as Types.ObjectId;
      const shopObjectId = new Types.ObjectId(shopId);
      const userObjectId = new Types.ObjectId(userId);

      // 2. Fetch inventory
      const inventory = await InventoryModel.findOne({
        shopId: shopObjectId,
        productId: productObjectId
      }).session(session || null);

      if (!inventory || inventory.quantityOnHand < input.quantitySold) {
        const available = inventory ? inventory.quantityOnHand : 0;
        throw new BadRequestError(
          `Insufficient stock for product '${product.name}'. Available: ${available} piece(s), Requested: ${input.quantitySold} piece(s)`,
          'INSUFFICIENT_STOCK',
          { availableQuantity: available, requestedQuantity: input.quantitySold }
        );
      }

      // 3. Determine effective selling rate
      let effectiveSellingRate: number;
      if (input.sellingRatePerPiece !== undefined && input.sellingRatePerPiece > 0) {
        effectiveSellingRate = input.sellingRatePerPiece;
      } else if (inventory.defaultSellingRatePerPiece > 0) {
        effectiveSellingRate = inventory.defaultSellingRatePerPiece;
      } else {
        throw new BadRequestError(
          `Selling rate must be specified because no default selling rate is set for product '${product.name}'`
        );
      }

      // 4. Calculate financials on the backend
      const totalSellingPrice = MoneyUtil.multiply(input.quantitySold, effectiveSellingRate);
      const unitCostAtSale = MoneyUtil.round(inventory.averageUnitCost);
      const costOfGoodsSold = MoneyUtil.multiply(input.quantitySold, unitCostAtSale);
      const grossProfit = MoneyUtil.round(totalSellingPrice - costOfGoodsSold);

      const quantityBefore = inventory.quantityOnHand;
      const quantityAfter = quantityBefore - input.quantitySold;

      // 5. Concurrency protection: Atomically decrement stock ensuring quantity >= quantitySold
      const updatedInventory = await InventoryModel.findOneAndUpdate(
        {
          _id: inventory._id,
          quantityOnHand: { $gte: input.quantitySold }
        },
        {
          $inc: { quantityOnHand: -input.quantitySold }
        },
        {
          new: true,
          session: session || undefined
        }
      );

      if (!updatedInventory) {
        throw new BadRequestError(
          `Stock was depleted by a concurrent transaction. Please refresh and try again.`,
          'INSUFFICIENT_STOCK'
        );
      }

      // 6. Create Sale document
      const parsedSaleDate = input.saleDate ? new Date(input.saleDate) : new Date();
      const sales = await SaleModel.create(
        [
          {
            shopId: shopObjectId,
            productId: productObjectId,
            quantitySold: input.quantitySold,
            sellingRatePerPiece: effectiveSellingRate,
            totalSellingPrice,
            unitCostAtSale,
            costOfGoodsSold,
            grossProfit,
            saleDate: isNaN(parsedSaleDate.getTime()) ? new Date() : parsedSaleDate,
            notes: input.notes?.trim(),
            createdBy: userObjectId
          }
        ],
        { session: session || undefined }
      );

      const sale = sales[0];

      // 7. Create immutable StockMovement history record
      await StockMovementModel.create(
        [
          {
            shopId: shopObjectId,
            productId: productObjectId,
            movementType: MovementType.SALE,
            quantityChange: -input.quantitySold,
            quantityBefore,
            quantityAfter,
            referenceType: ReferenceType.SALE,
            referenceId: sale._id,
            notes: input.notes?.trim() || `Customer sale (${input.quantitySold} pcs @ ৳${effectiveSellingRate})`,
            createdBy: userObjectId
          }
        ],
        { session: session || undefined }
      );

      // Populate and return saved sale
      const populated = await SaleModel.findById(sale._id)
        .populate('productId', 'name normalizedName sku')
        .populate('shopId', 'name code')
        .populate('createdBy', 'name phone')
        .session(session || null);

      return populated!.toJSON() as unknown as ISaleResponse;
    });
  }

  public static async list(
    shopId: string,
    query: ListSalesQuery
  ): Promise<PaginatedResult<ISaleResponse>> {
    const pagination = PaginationUtil.parse(
      query,
      ['saleDate', 'createdAt', 'totalSellingPrice', 'grossProfit', 'quantitySold'],
      'saleDate'
    );

    const filter: Record<string, unknown> = {
      shopId: new Types.ObjectId(shopId)
    };

    if (query.productId && Types.ObjectId.isValid(query.productId)) {
      filter.productId = new Types.ObjectId(query.productId);
    }

    if (query.startDate || query.endDate) {
      filter.saleDate = {};
      if (query.startDate) {
        (filter.saleDate as Record<string, unknown>).$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (filter.saleDate as Record<string, unknown>).$lte = new Date(query.endDate);
      }
    }

    const [docs, total] = await Promise.all([
      SaleModel.find(filter)
        .populate('productId', 'name normalizedName sku')
        .populate('shopId', 'name code')
        .populate('createdBy', 'name phone')
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit),
      SaleModel.countDocuments(filter)
    ]);

    const formattedDocs = docs.map((doc) => doc.toJSON() as unknown as ISaleResponse);
    return PaginationUtil.format(formattedDocs, total, pagination);
  }

  public static async getById(
    shopId: string,
    saleId: string
  ): Promise<ISaleResponse> {
    const sale = await SaleModel.findOne({
      _id: new Types.ObjectId(saleId),
      shopId: new Types.ObjectId(shopId)
    })
      .populate('productId', 'name normalizedName sku description')
      .populate('shopId', 'name code')
      .populate('createdBy', 'name phone');

    if (!sale) {
      throw new NotFoundError(`Sale '${saleId}' not found`);
    }

    return sale.toJSON() as unknown as ISaleResponse;
  }

  public static async update(
    shopId: string,
    saleId: string,
    _userId: string,
    input: UpdateSaleInput
  ): Promise<ISaleResponse> {
    return await withTransaction(async (session) => {
      const sale = await SaleModel.findOne({
        _id: new Types.ObjectId(saleId),
        shopId: new Types.ObjectId(shopId)
      }).session(session || null);

      if (!sale) {
        throw new NotFoundError(`Sale '${saleId}' not found`);
      }

      const shopObjectId = new Types.ObjectId(shopId);
      const productObjectId = (input.productId && Types.ObjectId.isValid(input.productId))
        ? new Types.ObjectId(input.productId)
        : (sale.productId as Types.ObjectId);

      const oldQty = sale.quantitySold;
      const newQty = input.quantitySold !== undefined ? input.quantitySold : oldQty;
      const newSellingRate = input.sellingRatePerPiece !== undefined ? input.sellingRatePerPiece : sale.sellingRatePerPiece;

      // Handle product change or quantity change
      if (productObjectId.toString() !== (sale.productId as Types.ObjectId).toString()) {
        // Return old stock
        await InventoryModel.findOneAndUpdate(
          { shopId: shopObjectId, productId: sale.productId },
          { $inc: { quantityOnHand: oldQty } },
          { session: session || undefined }
        );

        // Deduct from new product
        const targetInventory = await InventoryModel.findOne({
          shopId: shopObjectId,
          productId: productObjectId
        }).session(session || null);

        if (!targetInventory || targetInventory.quantityOnHand < newQty) {
          throw new BadRequestError('Insufficient stock for selected new product');
        }

        targetInventory.quantityOnHand -= newQty;
        await targetInventory.save({ session: session || undefined });
        sale.productId = productObjectId;
      } else {
        const qtyDelta = newQty - oldQty;
        if (qtyDelta !== 0) {
          const inventory = await InventoryModel.findOne({
            shopId: shopObjectId,
            productId: productObjectId
          }).session(session || null);

          if (!inventory || inventory.quantityOnHand < qtyDelta) {
            throw new BadRequestError('Insufficient stock to increase sale quantity');
          }

          inventory.quantityOnHand -= qtyDelta;
          await inventory.save({ session: session || undefined });
        }
      }

      // Recalculate totals
      const totalSellingPrice = MoneyUtil.multiply(newQty, newSellingRate);
      const costOfGoodsSold = MoneyUtil.multiply(newQty, sale.unitCostAtSale);
      const grossProfit = MoneyUtil.round(totalSellingPrice - costOfGoodsSold);

      sale.quantitySold = newQty;
      sale.sellingRatePerPiece = newSellingRate;
      sale.totalSellingPrice = totalSellingPrice;
      sale.costOfGoodsSold = costOfGoodsSold;
      sale.grossProfit = grossProfit;
      if (input.saleDate) {
        const parsedDate = new Date(input.saleDate);
        if (!isNaN(parsedDate.getTime())) sale.saleDate = parsedDate;
      }
      if (input.notes !== undefined) sale.notes = input.notes.trim();

      await sale.save({ session: session || undefined });

      // Update movement
      await StockMovementModel.findOneAndUpdate(
        {
          shopId: shopObjectId,
          referenceType: ReferenceType.SALE,
          referenceId: sale._id
        },
        {
          quantityChange: -newQty,
          notes: sale.notes || `Customer sale updated (${newQty} pcs @ ৳${newSellingRate})`
        },
        { session: session || undefined }
      );

      const populated = await SaleModel.findById(sale._id)
        .populate('productId', 'name normalizedName sku')
        .populate('shopId', 'name code')
        .populate('createdBy', 'name phone')
        .session(session || null);

      return populated!.toJSON() as unknown as ISaleResponse;
    });
  }

  public static async delete(shopId: string, saleId: string): Promise<{ success: boolean; message: string }> {
    return await withTransaction(async (session) => {
      const sale = await SaleModel.findOne({
        _id: new Types.ObjectId(saleId),
        shopId: new Types.ObjectId(shopId)
      }).session(session || null);

      if (!sale) {
        throw new NotFoundError(`Sale '${saleId}' not found`);
      }

      const shopObjectId = new Types.ObjectId(shopId);

      // Return stock to inventory
      await InventoryModel.findOneAndUpdate(
        {
          shopId: shopObjectId,
          productId: sale.productId
        },
        {
          $inc: { quantityOnHand: sale.quantitySold }
        },
        { session: session || undefined }
      );

      // Remove stock movement
      await StockMovementModel.deleteMany(
        {
          shopId: shopObjectId,
          referenceType: ReferenceType.SALE,
          referenceId: sale._id
        },
        { session: session || undefined }
      );

      // Delete sale
      await SaleModel.findByIdAndDelete(sale._id, { session: session || undefined });

      return { success: true, message: 'Sale deleted successfully' };
    });
  }
}
