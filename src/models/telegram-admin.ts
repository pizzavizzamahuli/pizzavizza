import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export type TelegramAdminStatus = 'PENDING' | 'ACTIVE' | 'REVOKED';

export interface TelegramAdminDocument {
  _id?: ObjectId;
  id?: string;
  userId: string; // application user id
  telegramUserId: string | null;
  telegramChatId: string; // chat id where bot interactions happen
  status: TelegramAdminStatus;
  role?: string | null; // optional mapping to app roles
  linkedAt?: Date | null;
  lastUsedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const TELEGRAM_ADMINS_COLLECTION = 'telegram_admins';

let telegramAdminsCollectionPromise: Promise<Collection<TelegramAdminDocument>> | null = null;

export async function getTelegramAdminsCollection() {
  if (telegramAdminsCollectionPromise) return telegramAdminsCollectionPromise;

  telegramAdminsCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<TelegramAdminDocument>(TELEGRAM_ADMINS_COLLECTION);
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ telegramChatId: 1 });
    return collection;
  })();

  return telegramAdminsCollectionPromise;
}

export async function findTelegramAdminByChat(chatId: string) {
  const col = await getTelegramAdminsCollection();
  return col.findOne({ telegramChatId: chatId });
}

export async function findTelegramAdminByUser(userId: string) {
  const col = await getTelegramAdminsCollection();
  return col.findOne({ userId });
}

export async function listActiveTelegramAdmins() {
  const col = await getTelegramAdminsCollection();
  return col.find({ status: 'ACTIVE' }).toArray();
}

export async function createTelegramAdmin(doc: Partial<TelegramAdminDocument>) {
  const col = await getTelegramAdminsCollection();
  const now = new Date();
  const toInsert: TelegramAdminDocument = {
    userId: doc.userId || '',
    telegramUserId: doc.telegramUserId || null,
    telegramChatId: doc.telegramChatId || '',
    status: doc.status || 'PENDING',
    role: doc.role || null,
    linkedAt: doc.linkedAt || null,
    lastUsedAt: doc.lastUsedAt || null,
    createdAt: now,
    updatedAt: now,
  } as TelegramAdminDocument;

  const res = await col.insertOne(toInsert as TelegramAdminDocument);
  return { ...toInsert, _id: res.insertedId, id: res.insertedId.toHexString() } as TelegramAdminDocument;
}

export async function activateTelegramAdmin(id: string) {
  const col = await getTelegramAdminsCollection();
  const now = new Date();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { status: 'ACTIVE', linkedAt: now, updatedAt: now } });
  return col.findOne({ _id: new ObjectId(id) });
}

export async function revokeTelegramAdmin(id: string) {
  const col = await getTelegramAdminsCollection();
  const now = new Date();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { status: 'REVOKED', updatedAt: now } });
  return true;
}
