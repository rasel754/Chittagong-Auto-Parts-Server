import { z } from 'zod';

export const createSaleSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required')
  }),
  body: z.object({
    productId: z.string({ required_error: 'Product ID is required' }).min(1),
    quantitySold: z
      .number({ required_error: 'Quantity sold is required' })
      .int('Quantity sold must be an integer')
      .positive('Quantity sold must be at least 1 piece'),
    sellingRatePerPiece: z
      .number()
      .min(0, 'Selling rate cannot be negative')
      .optional(),
    saleDate: z.string().datetime({ offset: true }).optional().or(z.string().optional()),
    notes: z.string().trim().optional()
  })
});

export const listSalesSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required')
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    productId: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.enum(['saleDate', 'createdAt', 'totalSellingPrice', 'grossProfit', 'quantitySold']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
});

export const getSaleByIdSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required'),
    saleId: z.string().min(1, 'Sale ID is required')
  })
});

export const updateSaleSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required'),
    saleId: z.string().min(1, 'Sale ID is required')
  }),
  body: z.object({
    productId: z.string().optional(),
    quantitySold: z
      .number()
      .int('Quantity sold must be an integer')
      .positive('Quantity sold must be at least 1 piece')
      .optional(),
    sellingRatePerPiece: z
      .number()
      .min(0, 'Selling rate cannot be negative')
      .optional(),
    saleDate: z.string().datetime({ offset: true }).optional().or(z.string().optional()),
    notes: z.string().trim().optional()
  })
});

export const deleteSaleSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required'),
    saleId: z.string().min(1, 'Sale ID is required')
  })
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>['body'];
export type UpdateSaleInput = z.infer<typeof updateSaleSchema>['body'];

