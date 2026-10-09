import { z } from 'zod';

export const dashboardOverviewSchema = z.object({
  query: z.object({
    period: z.enum(['today', 'yesterday', '7d', '30d', 'this_month', 'last_month', 'all_time']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    shopId: z.string().optional()
  })
});

export const shopDashboardSchema = z.object({
  params: z.object({
    shopId: z.string().min(1, 'Shop ID is required')
  }),
  query: z.object({
    period: z.enum(['today', 'yesterday', '7d', '30d', 'this_month', 'last_month', 'all_time']).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional()
  })
});
