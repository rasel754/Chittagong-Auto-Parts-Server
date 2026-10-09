import { z } from 'zod';
import { MovementType, ReferenceType } from '../../common/constants/movement-types.constant.js';

export const listStockMovementsSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required')
  }),
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    productId: z.string().optional(),
    movementType: z.enum([
      MovementType.STOCK_IN,
      MovementType.SALE,
      MovementType.ADJUSTMENT,
      MovementType.RETURN
    ]).optional(),
    referenceType: z.enum([
      ReferenceType.STOCK_ENTRY,
      ReferenceType.SALE,
      ReferenceType.MANUAL_ADJUSTMENT
    ]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    sortBy: z.enum(['createdAt', 'quantityChange']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional()
  })
});
