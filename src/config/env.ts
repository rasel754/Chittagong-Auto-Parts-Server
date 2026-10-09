import dotenv from 'dotenv';
import { z } from 'zod';

// Load .env file
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(5000),
  MONGODB_URI: z.string().default('mongodb+srv://kamal-vai:Hh5GaeJRmvdIbTRM@cluster0.2zt49zv.mongodb.net/kamal-vai-store?appName=Cluster0'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters long').default('f9bc167a389960c86b81d77f13e6ce9bc8bb7468384dd539c7e8fadc63a80a52'),
  JWT_EXPIRES_IN: z.string().default('14d'),
  CLIENT_ORIGIN: z.string().default('*'),
  BOOTSTRAP_ADMIN_NAME: z.string().default('System Administrator'),
  BOOTSTRAP_ADMIN_PHONE: z.string().default('01811000000'),
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(8, 'BOOTSTRAP_ADMIN_PASSWORD must be at least 8 characters long').default('AdminPassword123!'),
  APP_TIMEZONE: z.string().default('Asia/Dhaka'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(15 * 60 * 1000), // 15 mins
  RATE_LIMIT_MAX: z.coerce.number().default(500),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().default(50)
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error('❌ Invalid environment configuration:');
  console.error(JSON.stringify(parsedEnv.error.format(), null, 2));
  process.exit(1);
}

export const env = parsedEnv.data;
export type EnvConfig = z.infer<typeof envSchema>;
