import { z } from 'zod';

export const listInventorySchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required')
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    lowStockOnly: z.enum(['true', 'false']).optional(),
    sortBy: z.enum(['quantityOnHand', 'createdAt', 'updatedAt', 'averageUnitCost', 'defaultSellingRatePerPiece']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
});

export const getInventoryByProductSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required'),
    productId: z.string().min(1, 'Product ID is required')
  })
});

export const updateInventorySchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required'),
    productId: z.string().min(1, 'Product ID is required')
  }),
  body: z.object({
    defaultSellingRatePerPiece: z.number().min(0, 'Selling rate cannot be negative').optional(),
    lowStockThreshold: z.number().int().min(0, 'Threshold cannot be negative').optional()
  })
});
