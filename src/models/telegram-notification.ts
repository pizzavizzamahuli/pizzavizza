import { Collection } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

interface TelegramNotificationDocument { chatId: string; eventKey: string; createdAt: Date }
let collectionPromise: Promise<Collection<TelegramNotificationDocument>> | null = null;

async function getCollection() {
  if (collectionPromise) return collectionPromise;
  collectionPromise = (async () => {
    const db = (await getDatabaseClient()).db(await getDatabaseName());
    const collection = db.collection<TelegramNotificationDocument>('telegram_notifications');
    await collection.createIndex({ chatId: 1, eventKey: 1 }, { unique: true });
    await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
    return collection;
  })();
  return collectionPromise;
}

export async function claimTelegramNotification(chatId: string | number, eventKey: string) {
  try {
    await (await getCollection()).insertOne({ chatId: String(chatId), eventKey, createdAt: new Date() });
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && /duplicate|E11000/i.test(error.message)) return false;
    throw error;
  }
}

export async function releaseTelegramNotification(chatId: string | number, eventKey: string) {
  await (await getCollection()).deleteOne({ chatId: String(chatId), eventKey });
}
