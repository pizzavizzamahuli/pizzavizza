import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGODB_URI: z.string().optional(),
  MONGODB_DB_NAME: z.string().default('pizzavizza'),
  AUTH_SECRET: z.string().optional(),
  INITIAL_ADMIN_EMAIL: z.string().optional(),
  INITIAL_ADMIN_PASSWORD: z.string().optional(),
  INITIAL_ADMIN_NAME: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_APP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  TELEGRAM_ALLOWED_CHAT_IDS: z.string().optional(),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  ENABLE_FORCE_LOGIN: z.coerce.boolean().default(false),
  ENABLE_REQUEST_LOG: z.coerce.boolean().default(false),
});

export type Env = z.infer<typeof envSchema>;
export const env = envSchema.parse(process.env);

export const isServer = typeof window === 'undefined';

export function requireEnvVar<K extends keyof Env>(key: K): string {
  const value = env[key];
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${String(key)} is required but not configured.`);
  }
  return value;
}
