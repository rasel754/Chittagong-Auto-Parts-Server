import { Types, PipelineStage } from 'mongoose';
import { InventoryModel } from '../inventory/inventory.model.js';
import { SaleModel } from '../sales/sale.model.js';
import { StockEntryModel } from '../stock-entries/stock-entry.model.js';
import { ShopModel } from '../shops/shop.model.js';
import { DateUtil } from '../../common/utils/date.util.js';
import { MoneyUtil } from '../../common/utils/money.util.js';
import { UserRole } from '../../common/constants/roles.constant.js';
import { AuthenticatedUser } from '../../types/express.js';

export interface DashboardFilterQuery {
  period?: string;
  startDate?: string;
  endDate?: string;
  shopId?: string;
}

export interface ShopSummaryItem {
  shopId: string;
  shopName: string;
  shopCode: string;
  totalProducts: number;
  totalStockUnits: number;
  stockValue: number;
  periodSalesRevenue: number;
  periodGrossProfit: number;
  periodTotalSalesCount: number;
}

export interface GlobalDashboardOverview {
  reportingPeriod: {
    period: string;
    startDate: Date | null;
    endDate: Date | null;
  };
  metrics: {
    totalDistinctProducts: number;
    totalStockUnits: number;
    totalInventoryCostValue: number;
    totalSalesRevenue: number;
    totalGrossProfit: number;
    totalSalesCount: number;
  };
  shopBreakdown: ShopSummaryItem[];
  recentSales: unknown[];
  recentStockEntries: unknown[];
  lowStockAlerts: unknown[];
}

export interface SingleShopDashboard {
  shop: {
    id: string;
    name: string;
    code: string;
    status: string;
  };
  reportingPeriod: {
    period: string;
    startDate: Date | null;
    endDate: Date | null;
  };
  metrics: {
    distinctProductCount: number;
    totalQuantityOnHand: number;
    inventoryCostValue: number;
    salesRevenue: number;
    grossProfit: number;
    salesCount: number;
  };
  recentSales: unknown[];
  recentStockEntries: unknown[];
  lowStockProducts: unknown[];
}

export class DashboardService {
  /**
   * Resolves permitted shop ObjectIds for the authenticated user
   */
  private static async getAuthorizedShopIds(
    user: AuthenticatedUser,
    targetShopId?: string
  ): Promise<Types.ObjectId[]> {
    if (targetShopId) {
      // If specific shop is requested, verify user authorization
      const targetObjId = new Types.ObjectId(targetShopId);
      if (user.role !== UserRole.ADMIN) {
        const hasAccess = user.permittedShopIds.includes(targetShopId);
        if (!hasAccess) return [];
      }
      return [targetObjId];
    }

    if (user.role === UserRole.ADMIN) {
      const allShops = await ShopModel.find({}, { _id: 1 }).lean();
      return allShops.map((s) => s._id as Types.ObjectId);
    }

    return user.permittedShopIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));
  }

  public static async getOverview(
    user: AuthenticatedUser,
    query: DashboardFilterQuery
  ): Promise<GlobalDashboardOverview> {
    const shopObjectIds = await this.getAuthorizedShopIds(user, query.shopId);
    const dateRange = DateUtil.parseReportingPeriod(query.period || '30d', query.startDate, query.endDate);

    // 1. Inventory Aggregations: Total distinct products, total units, total inventory value
    const inventoryPipeline: PipelineStage[] = [
      { $match: { shopId: { $in: shopObjectIds } } },
      {
        $group: {
          _id: null,
          distinctProductIds: { $addToSet: '$productId' },
          totalUnits: { $sum: '$quantityOnHand' },
          totalStockValue: {
            $sum: { $multiply: ['$quantityOnHand', '$averageUnitCost'] }
          }
        }
      }
    ];

    // 2. Sales Aggregations within period
    const salesMatch: Record<string, unknown> = {
      shopId: { $in: shopObjectIds }
    };
    if (dateRange) {
      salesMatch.saleDate = {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate
      };
    }

    const salesPipeline: PipelineStage[] = [
      { $match: salesMatch },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalSellingPrice' },
          totalGrossProfit: { $sum: '$grossProfit' },
          totalSalesCount: { $sum: 1 }
        }
      }
    ];

    // 3. Run all top-level queries, aggregations, and recent records concurrently in parallel
    const [
      invResults,
      salesResults,
      activeShops,
      shopInvStats,
      shopSalesStats,
      recentSales,
      recentStockEntries,
      lowStockAlerts
    ] = await Promise.all([
      InventoryModel.aggregate(inventoryPipeline),
      SaleModel.aggregate(salesPipeline),
      ShopModel.find({ _id: { $in: shopObjectIds } }).lean(),
      InventoryModel.aggregate([
        { $match: { shopId: { $in: shopObjectIds } } },
        {
          $group: {
            _id: '$shopId',
            productCount: { $sum: 1 },
            totalUnits: { $sum: '$quantityOnHand' },
            stockValue: {
              $sum: { $multiply: ['$quantityOnHand', '$averageUnitCost'] }
            }
          }
        }
      ]),
      SaleModel.aggregate([
        { $match: salesMatch },
        {
          $group: {
            _id: '$shopId',
            totalRevenue: { $sum: '$totalSellingPrice' },
            totalGrossProfit: { $sum: '$grossProfit' },
            totalCount: { $sum: 1 }
          }
        }
      ]),
      SaleModel.find({ shopId: { $in: shopObjectIds } })
        .populate('productId', 'name sku')
        .populate('shopId', 'name code')
        .populate('createdBy', 'name')
        .sort({ saleDate: -1 })
        .limit(10)
        .lean(),
      StockEntryModel.find({ shopId: { $in: shopObjectIds } })
        .populate('productId', 'name sku')
        .populate('shopId', 'name code')
        .populate('createdBy', 'name')
        .sort({ entryDate: -1 })
        .limit(10)
        .lean(),
      InventoryModel.find({
        shopId: { $in: shopObjectIds },
        $expr: { $lte: ['$quantityOnHand', '$lowStockThreshold'] }
      })
        .populate('productId', 'name sku')
        .populate('shopId', 'name code')
        .sort({ quantityOnHand: 1 })
        .limit(10)
        .lean()
    ]);

    const invData = invResults[0] || {
      distinctProductIds: [],
      totalUnits: 0,
      totalStockValue: 0
    };

    const salesData = salesResults[0] || {
      totalRevenue: 0,
      totalGrossProfit: 0,
      totalSalesCount: 0
    };

    const invMap = new Map<string, { productCount: number; totalUnits: number; stockValue: number }>();
    for (const item of shopInvStats) {
      if (item._id) {
        invMap.set(item._id.toString(), item);
      }
    }

    const salesMap = new Map<string, { totalRevenue: number; totalGrossProfit: number; totalCount: number }>();
    for (const item of shopSalesStats) {
      if (item._id) {
        salesMap.set(item._id.toString(), item);
      }
    }

    const shopBreakdown: ShopSummaryItem[] = activeShops.map((shop) => {
      const sId = (shop._id as Types.ObjectId).toString();
      const sInv = invMap.get(sId);
      const sSales = salesMap.get(sId);

      return {
        shopId: sId,
        shopName: shop.name,
        shopCode: shop.code,
        totalProducts: sInv ? sInv.productCount : 0,
        totalStockUnits: sInv ? sInv.totalUnits : 0,
        stockValue: sInv ? MoneyUtil.round(sInv.stockValue) : 0,
        periodSalesRevenue: sSales ? MoneyUtil.round(sSales.totalRevenue) : 0,
        periodGrossProfit: sSales ? MoneyUtil.round(sSales.totalGrossProfit) : 0,
        periodTotalSalesCount: sSales ? sSales.totalCount : 0
      };
    });

    return {
      reportingPeriod: {
        period: query.period || (dateRange ? 'custom' : 'all_time'),
        startDate: dateRange ? dateRange.startDate : null,
        endDate: dateRange ? dateRange.endDate : null
      },
      metrics: {
        totalDistinctProducts: invData.distinctProductIds.length,
        totalStockUnits: invData.totalUnits,
        totalInventoryCostValue: MoneyUtil.round(invData.totalStockValue),
        totalSalesRevenue: MoneyUtil.round(salesData.totalRevenue),
        totalGrossProfit: MoneyUtil.round(salesData.totalGrossProfit),
        totalSalesCount: salesData.totalSalesCount
      },
      shopBreakdown,
      recentSales,
      recentStockEntries,
      lowStockAlerts
    };
  }

  public static async getShopDashboard(
    shopId: string,
    query: DashboardFilterQuery
  ): Promise<SingleShopDashboard> {
    const shopObjectId = new Types.ObjectId(shopId);
    const shop = await ShopModel.findById(shopObjectId).lean();
    if (!shop) {
      throw new Error(`Shop with ID '${shopId}' not found`);
    }

    const dateRange = DateUtil.parseReportingPeriod(query.period || '30d', query.startDate, query.endDate);

    const salesMatch: Record<string, unknown> = { shopId: shopObjectId };
    if (dateRange) {
      salesMatch.saleDate = {
        $gte: dateRange.startDate,
        $lte: dateRange.endDate
      };
    }

    // Run all shop-specific metrics and lists in parallel
    const [
      [invData],
      [salesData],
      recentSales,
      recentStockEntries,
      lowStockProducts
    ] = await Promise.all([
      InventoryModel.aggregate([
        { $match: { shopId: shopObjectId } },
        {
          $group: {
            _id: null,
            productCount: { $sum: 1 },
            totalUnits: { $sum: '$quantityOnHand' },
            stockValue: {
              $sum: { $multiply: ['$quantityOnHand', '$averageUnitCost'] }
            }
          }
        }
      ]),
      SaleModel.aggregate([
        { $match: salesMatch },
        {
          $group: {
            _id: null,
            totalRevenue: { $sum: '$totalSellingPrice' },
            totalGrossProfit: { $sum: '$grossProfit' },
            salesCount: { $sum: 1 }
          }
        }
      ]),
      SaleModel.find({ shopId: shopObjectId })
        .populate('productId', 'name sku')
        .populate('createdBy', 'name')
        .sort({ saleDate: -1 })
        .limit(10)
        .lean(),
      StockEntryModel.find({ shopId: shopObjectId })
        .populate('productId', 'name sku')
        .populate('createdBy', 'name')
        .sort({ entryDate: -1 })
        .limit(10)
        .lean(),
      InventoryModel.find({
        shopId: shopObjectId,
        $expr: { $lte: ['$quantityOnHand', '$lowStockThreshold'] }
      })
        .populate('productId', 'name sku')
        .sort({ quantityOnHand: 1 })
        .limit(10)
        .lean()
    ]);

    return {
      shop: {
        id: shop._id.toString(),
        name: shop.name,
        code: shop.code,
        status: shop.status
      },
      reportingPeriod: {
        period: query.period || (dateRange ? 'custom' : 'all_time'),
        startDate: dateRange ? dateRange.startDate : null,
        endDate: dateRange ? dateRange.endDate : null
      },
      metrics: {
        distinctProductCount: invData ? invData.productCount : 0,
        totalQuantityOnHand: invData ? invData.totalUnits : 0,
        inventoryCostValue: invData ? MoneyUtil.round(invData.stockValue) : 0,
        salesRevenue: salesData ? MoneyUtil.round(salesData.totalRevenue) : 0,
        grossProfit: salesData ? MoneyUtil.round(salesData.totalGrossProfit) : 0,
        salesCount: salesData ? salesData.salesCount : 0
      },
      recentSales,
      recentStockEntries,
      lowStockProducts
    };
  }
}
