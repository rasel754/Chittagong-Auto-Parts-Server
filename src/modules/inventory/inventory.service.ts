import { Types } from 'mongoose';
import { InventoryModel } from './inventory.model.js';
import { ProductModel } from '../products/product.model.js';
import { NotFoundError } from '../../common/errors/not-found.error.js';
import { PaginationUtil, PaginatedResult } from '../../common/pagination.js';
import { IInventoryResponse } from './inventory.interface.js';

export interface ListInventoryQuery {
  page?: string;
  limit?: string;
  search?: string;
  lowStockOnly?: 'true' | 'false';
  sortBy?: string;
  sortOrder?: string;
}

export interface UpdateInventoryInput {
  defaultSellingRatePerPiece?: number;
  lowStockThreshold?: number;
}

export class InventoryService {
  public static async listByShop(
    shopId: string,
    query: ListInventoryQuery
  ): Promise<PaginatedResult<IInventoryResponse>> {
    const pagination = PaginationUtil.parse(
      query,
      ['quantityOnHand', 'createdAt', 'updatedAt', 'averageUnitCost', 'defaultSellingRatePerPiece'],
      'quantityOnHand'
    );

    const filter: Record<string, unknown> = {
      shopId: new Types.ObjectId(shopId)
    };

    if (query.lowStockOnly === 'true') {
      filter.$expr = { $lte: ['$quantityOnHand', '$lowStockThreshold'] };
    }

    // If search term provided, find matching product IDs first
    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      const matchingProducts = await ProductModel.find(
        {
          $or: [{ name: searchRegex }, { sku: searchRegex }, { description: searchRegex }]
        },
        { _id: 1 }
      ).lean();

      const matchingProductIds = matchingProducts.map((p) => p._id);
      filter.productId = { $in: matchingProductIds };
    }

    const [docs, total] = await Promise.all([
      InventoryModel.find(filter)
        .populate('productId', 'name normalizedName sku description')
        .populate('shopId', 'name code status')
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit),
      InventoryModel.countDocuments(filter)
    ]);

    const formattedDocs = docs.map((doc) => doc.toJSON() as unknown as IInventoryResponse);
    return PaginationUtil.format(formattedDocs, total, pagination);
  }

  public static async getByProduct(
    shopId: string,
    productId: string
  ): Promise<IInventoryResponse> {
    const filter: Record<string, unknown> = {
      shopId: new Types.ObjectId(shopId)
    };

    if (Types.ObjectId.isValid(productId)) {
      filter.productId = new Types.ObjectId(productId);
    } else {
      // Lookup product by SKU
      const product = await ProductModel.findOne({ sku: productId });
      if (!product) {
        throw new NotFoundError(`Product '${productId}' not found`);
      }
      filter.productId = product._id;
    }

    let inventory = await InventoryModel.findOne(filter)
      .populate('productId', 'name normalizedName sku description')
      .populate('shopId', 'name code status');

    // If no inventory record exists yet for this shop + product, return a zero-quantity virtual representation
    if (!inventory) {
      const product = await ProductModel.findById(filter.productId);
      if (!product) {
        throw new NotFoundError(`Product '${productId}' not found`);
      }

      return {
        id: '',
        shopId,
        productId: product.toJSON() as unknown as IInventoryResponse['productId'],
        quantityOnHand: 0,
        averageUnitCost: 0,
        defaultSellingRatePerPiece: 0,
        lowStockThreshold: 5,
        stockValue: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }

    return inventory.toJSON() as unknown as IInventoryResponse;
  }

  public static async update(
    shopId: string,
    productId: string,
    input: UpdateInventoryInput
  ): Promise<IInventoryResponse> {
    const filter: Record<string, unknown> = {
      shopId: new Types.ObjectId(shopId),
      productId: new Types.ObjectId(productId)
    };

    let inventory = await InventoryModel.findOne(filter);

    if (!inventory) {
      // If record does not exist, create it with 0 stock
      inventory = await InventoryModel.create({
        shopId: new Types.ObjectId(shopId),
        productId: new Types.ObjectId(productId),
        quantityOnHand: 0,
        averageUnitCost: 0,
        defaultSellingRatePerPiece: input.defaultSellingRatePerPiece || 0,
        lowStockThreshold: input.lowStockThreshold !== undefined ? input.lowStockThreshold : 5
      });
    } else {
      if (input.defaultSellingRatePerPiece !== undefined) {
        inventory.defaultSellingRatePerPiece = input.defaultSellingRatePerPiece;
      }
      if (input.lowStockThreshold !== undefined) {
        inventory.lowStockThreshold = input.lowStockThreshold;
      }
      await inventory.save();
    }

    const populated = await InventoryModel.findById(inventory._id)
      .populate('productId', 'name normalizedName sku description')
      .populate('shopId', 'name code status');

    return populated!.toJSON() as unknown as IInventoryResponse;
  }
}
