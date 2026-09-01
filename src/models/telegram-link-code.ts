import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';
import crypto from 'crypto';

export interface TelegramLinkCodeDocument {
  _id?: ObjectId;
  userId: string; // application user id who requested link
  codeHash: string; // sha256 hash of code
  expiresAt: Date;
  used: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TELEGRAM_LINK_CODES_COLLECTION = 'telegram_link_codes';

let telegramLinkCodesCollectionPromise: Promise<Collection<TelegramLinkCodeDocument>> | null = null;

export async function getTelegramLinkCodesCollection() {
  if (telegramLinkCodesCollectionPromise) return telegramLinkCodesCollectionPromise;

  telegramLinkCodesCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<TelegramLinkCodeDocument>(TELEGRAM_LINK_CODES_COLLECTION);
    await collection.createIndex({ codeHash: 1 });
    await collection.createIndex({ userId: 1 });
    return collection;
  })();

  return telegramLinkCodesCollectionPromise;
}

export function generateRawCode() {
  return crypto.randomBytes(20).toString('hex');
}

export function hashCode(raw: string) {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

export async function createLinkCode(userId: string, ttlSeconds = 300) {
  const col = await getTelegramLinkCodesCollection();
  const now = new Date();
  const raw = generateRawCode();
  const hashed = hashCode(raw);
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const doc: TelegramLinkCodeDocument = { userId, codeHash: hashed, expiresAt, used: false, createdAt: now, updatedAt: now };
  const res = await col.insertOne(doc);
  return { raw, record: { ...doc, _id: res.insertedId, id: res.insertedId.toHexString() } };
}

export async function consumeLinkCode(raw: string) {
  const col = await getTelegramLinkCodesCollection();
  const hashed = hashCode(raw);
  const now = new Date();
  const rec = await col.findOne({ codeHash: hashed });
  if (!rec) return { ok: false, reason: 'invalid' };
  if (rec.used) return { ok: false, reason: 'used' };
  if (rec.expiresAt < now) return { ok: false, reason: 'expired' };
  await col.updateOne({ _id: rec._id }, { $set: { used: true, updatedAt: now } });
  return { ok: true, record: rec };
}
