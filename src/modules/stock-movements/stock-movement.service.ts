import { Types } from 'mongoose';
import { StockMovementModel } from './stock-movement.model.js';
import { PaginationUtil, PaginatedResult } from '../../common/pagination.js';
import { IStockMovementResponse } from './stock-movement.interface.js';
import { MovementType, ReferenceType } from '../../common/constants/movement-types.constant.js';

export interface ListStockMovementsQuery {
  page?: string;
  limit?: string;
  productId?: string;
  movementType?: MovementType;
  referenceType?: ReferenceType;
  startDate?: string;
  endDate?: string;
  sortBy?: string;
  sortOrder?: string;
}

export class StockMovementService {
  public static async list(
    shopId: string,
    query: ListStockMovementsQuery
  ): Promise<PaginatedResult<IStockMovementResponse>> {
    const pagination = PaginationUtil.parse(
      query,
      ['createdAt', 'quantityChange'],
      'createdAt'
    );

    const filter: Record<string, unknown> = {
      shopId: new Types.ObjectId(shopId)
    };

    if (query.productId && Types.ObjectId.isValid(query.productId)) {
      filter.productId = new Types.ObjectId(query.productId);
    }

    if (query.movementType) {
      filter.movementType = query.movementType;
    }

    if (query.referenceType) {
      filter.referenceType = query.referenceType;
    }

    if (query.startDate || query.endDate) {
      filter.createdAt = {};
      if (query.startDate) {
        (filter.createdAt as Record<string, unknown>).$gte = new Date(query.startDate);
      }
      if (query.endDate) {
        (filter.createdAt as Record<string, unknown>).$lte = new Date(query.endDate);
      }
    }

    const [docs, total] = await Promise.all([
      StockMovementModel.find(filter)
        .populate('productId', 'name normalizedName sku')
        .populate('shopId', 'name code')
        .populate('createdBy', 'name phone')
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit),
      StockMovementModel.countDocuments(filter)
    ]);

    const formattedDocs = docs.map((doc) => doc.toJSON() as unknown as IStockMovementResponse);
    return PaginationUtil.format(formattedDocs, total, pagination);
  }
}
