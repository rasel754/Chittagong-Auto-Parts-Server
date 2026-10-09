import { z } from 'zod';
import { UserRole } from '../../common/constants/roles.constant.js';
import { CommonStatus } from '../../common/constants/status.constant.js';
import { PhoneUtil } from '../../common/utils/phone.util.js';

export const createUserSchema = z.object({
  body: z.object({
    name: z.string({ required_error: 'Name is required' }).trim().min(2),
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .refine(
        (val) => PhoneUtil.isValid(val),
        'Invalid Bangladeshi phone number (e.g. 01811000000)'
      ),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters'),
    role: z.enum([UserRole.ADMIN, UserRole.STAFF]).default(UserRole.STAFF),
    permittedShopIds: z.array(z.string()).optional().default([]),
    status: z.enum([CommonStatus.ACTIVE, CommonStatus.INACTIVE]).optional().default(CommonStatus.ACTIVE)
  })
});

export const updateUserSchema = z.object({
  params: z.object({
    userId: z.string().min(1, 'User ID is required')
  }),
  body: z.object({
    name: z.string().trim().min(2).optional(),
    phone: z
      .string()
      .trim()
      .refine((val) => PhoneUtil.isValid(val), 'Invalid Bangladeshi phone number')
      .optional(),
    password: z.string().min(6).optional(),
    role: z.enum([UserRole.ADMIN, UserRole.STAFF]).optional(),
    permittedShopIds: z.array(z.string()).optional(),
    status: z.enum([CommonStatus.ACTIVE, CommonStatus.INACTIVE]).optional()
  })
});

export const listUsersSchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    search: z.string().optional(),
    role: z.enum([UserRole.ADMIN, UserRole.STAFF]).optional(),
    status: z.enum([CommonStatus.ACTIVE, CommonStatus.INACTIVE]).optional(),
    shopId: z.string().optional()
  })
});
