import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { decryptSecret } from '@/src/utils/secret-crypto';

export type SecretKeyName = 'razorpayKeySecret' | 'telegramBotToken' | 'cloudinaryApiSecret';

const envFallbackMap: Record<SecretKeyName, string> = {
  razorpayKeySecret: 'RAZORPAY_KEY_SECRET',
  telegramBotToken: 'TELEGRAM_BOT_TOKEN',
  cloudinaryApiSecret: 'CLOUDINARY_API_SECRET',
};

export async function getSecret(key: SecretKeyName): Promise<string | null> {
  const settings = await getRestaurantSettings();
  const rawMap = settings as unknown as Record<string, string | null>;
  const raw = rawMap[key];
  if (typeof raw === 'string' && raw.length > 0) {
    const dec = decryptSecret(raw);
    if (dec) return dec;
  }

  const envKey = envFallbackMap[key];
  const val = (process.env as Record<string, string | undefined>)[envKey] || null;
  return typeof val === 'string' && val.length > 0 ? val : null;
}
