import { z } from 'zod';

export const createStockEntrySchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required')
  }),
  body: z.object({
    productId: z.string().optional(),
    // Alternatively client can pass productName & sku to create product inline if not exists
    productName: z.string().trim().min(2).optional(),
    productSku: z.string().trim().optional(),
    supplierName: z.string({ required_error: 'Supplier name is required' }).trim().min(2),
    quantityReceived: z
      .number({ required_error: 'Quantity received is required' })
      .int('Quantity must be an integer')
      .positive('Quantity received must be greater than 0'),
    buyingRatePerPiece: z
      .number({ required_error: 'Buying rate is required' })
      .min(0, 'Buying rate cannot be negative'),
    sellingRatePerPiece: z
      .number()
      .min(0, 'Selling rate cannot be negative')
      .optional(),
    entryDate: z.string().datetime({ offset: true }).optional().or(z.string().optional()),
    notes: z.string().trim().optional()
  })
});

export const listStockEntriesSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required')
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    productId: z.string().optional(),
    supplierName: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.enum(['entryDate', 'createdAt', 'totalPurchaseValue', 'quantityReceived']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
});

export const getStockEntryByIdSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required'),
    entryId: z.string().min(1, 'Stock entry ID is required')
  })
});

export const updateStockEntrySchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required'),
    entryId: z.string().min(1, 'Stock entry ID is required')
  }),
  body: z.object({
    productName: z.string().trim().min(2).optional(),
    productSku: z.string().trim().optional(),
    supplierName: z.string().trim().min(2).optional(),
    quantityReceived: z
      .number()
      .int('Quantity must be an integer')
      .positive('Quantity received must be greater than 0')
      .optional(),
    buyingRatePerPiece: z
      .number()
      .min(0, 'Buying rate cannot be negative')
      .optional(),
    sellingRatePerPiece: z
      .number()
      .min(0, 'Selling rate cannot be negative')
      .optional(),
    entryDate: z.string().datetime({ offset: true }).optional().or(z.string().optional()),
    notes: z.string().trim().optional()
  })
});

export const deleteStockEntrySchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required'),
    entryId: z.string().min(1, 'Stock entry ID is required')
  })
});

export type CreateStockEntryInput = z.infer<typeof createStockEntrySchema>['body'];
export type UpdateStockEntryInput = z.infer<typeof updateStockEntrySchema>['body'];

