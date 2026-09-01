import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export interface TelegramAuditDocument {
  _id?: ObjectId;
  performedByUserId?: string | null;
  telegramUserId?: string | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  payload?: Record<string, unknown> | null;
  timestamp: Date;
}

const TELEGRAM_AUDIT_COLLECTION = 'telegram_audit';

let telegramAuditCollectionPromise: Promise<Collection<TelegramAuditDocument>> | null = null;

export async function getTelegramAuditCollection() {
  if (telegramAuditCollectionPromise) return telegramAuditCollectionPromise;

  telegramAuditCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<TelegramAuditDocument>(TELEGRAM_AUDIT_COLLECTION);
    await collection.createIndex({ performedByUserId: 1 });
    await collection.createIndex({ telegramUserId: 1 });
    return collection;
  })();

  return telegramAuditCollectionPromise;
}

export async function recordTelegramAudit(entry: Partial<TelegramAuditDocument>) {
  const col = await getTelegramAuditCollection();
  const now = new Date();
  const doc: TelegramAuditDocument = {
    performedByUserId: entry.performedByUserId || null,
    telegramUserId: entry.telegramUserId || null,
    action: entry.action || 'unknown',
    targetType: entry.targetType || null,
    targetId: entry.targetId || null,
    payload: entry.payload || null,
    timestamp: now,
  };
  await col.insertOne(doc);
}
