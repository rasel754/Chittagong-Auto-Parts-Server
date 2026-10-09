import { z } from 'zod';
import { CommonStatus } from '../../common/constants/status.constant.js';

export const createShopSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Shop name is required' }).trim().min(2),
    code: z.string().trim().min(2).optional(),
    address: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    status: z.enum([CommonStatus.ACTIVE, CommonStatus.INACTIVE]).optional().default(CommonStatus.ACTIVE)
  })
});

export const updateShopSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required')
  }),
  body: z.object({
    name: z.string().trim().min(2).optional(),
    code: z.string().trim().min(2).optional(),
    address: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    status: z.enum([CommonStatus.ACTIVE, CommonStatus.INACTIVE]).optional()
  })
});

export const updateShopStatusSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required')
  }),
  body: z.object({
    status: z.enum([CommonStatus.ACTIVE, CommonStatus.INACTIVE], {
      required_error: 'Status is required and must be ACTIVE or INACTIVE'
    })
  })
});

export const listShopsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    status: z.enum([CommonStatus.ACTIVE, CommonStatus.INACTIVE]).optional()
  })
});
