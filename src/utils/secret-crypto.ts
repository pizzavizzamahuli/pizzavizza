import crypto from 'crypto';
import { env } from '@/src/config/env';

const ALGO = 'aes-256-gcm';

function getKey() {
  const secret = env.AUTH_SECRET || '';
  // derive 32-byte key from AUTH_SECRET using SHA256
  return crypto.createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string) {
  const iv = crypto.randomBytes(12);
  const key = getKey();
  const cipher = crypto.createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decryptSecret(cipherText: string) {
  try {
    const data = Buffer.from(cipherText, 'base64');
    const iv = data.slice(0, 12);
    const tag = data.slice(12, 28);
    const encrypted = data.slice(28);
    const key = getKey();
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return out.toString('utf8');
  } catch (e) {
    console.error('Failed to decrypt secret', e);
    return null;
  }
}
