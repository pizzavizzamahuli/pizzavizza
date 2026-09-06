import { Collection } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

interface TelegramUpdateDocument {
  updateId: number;
  createdAt: Date;
}

let collectionPromise: Promise<Collection<TelegramUpdateDocument>> | null = null;

async function getCollection() {
  if (collectionPromise) return collectionPromise;
  collectionPromise = (async () => {
    const db = (await getDatabaseClient()).db(await getDatabaseName());
    const collection = db.collection<TelegramUpdateDocument>('telegram_updates');
    await collection.createIndex({ updateId: 1 }, { unique: true });
    await collection.createIndex({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 30 });
    return collection;
  })();
  return collectionPromise;
}

export async function claimTelegramUpdate(updateId: number) {
  try {
    await (await getCollection()).insertOne({ updateId, createdAt: new Date() });
    return true;
  } catch (error: unknown) {
    if (error instanceof Error && /duplicate|E11000/i.test(error.message)) return false;
    throw error;
  }
}
