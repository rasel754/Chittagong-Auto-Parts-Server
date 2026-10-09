import { z } from 'zod';
import { PhoneUtil } from '../../common/utils/phone.util.js';

export const loginSchema = z.object({
  body: z.object({
    phone: z
      .string({ required_error: 'Phone number is required' })
      .trim()
      .refine(
        (val) => PhoneUtil.isValid(val),
        'Invalid Bangladeshi phone number (e.g. 01811000000)'
      ),
    password: z
      .string({ required_error: 'Password is required' })
      .min(6, 'Password must be at least 6 characters')
  })
});

export type LoginInput = z.infer<typeof loginSchema>['body'];
