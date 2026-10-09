import { z } from 'zod';

export const createProductSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Product name is required' }).trim().min(2),
    sku: z.string().trim().optional(),
    description: z.string().trim().optional()
  })
});

export const updateProductSchema = z.object({
  params: z.object({
    productId: z.string().min(1, 'Product ID is required')
  }),
  body: z.object({
    name: z.string().trim().min(2).optional(),
    sku: z.string().trim().optional(),
    description: z.string().trim().optional()
  })
});

export const listProductsSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    sku: z.string().optional()
  })
});
