import { Collection, ObjectId, ClientSession } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

interface DiningAvailabilityLockDocument {
  _id?: ObjectId;
  key: string;
  touchedAt: Date;
}

const COLLECTION = 'dining_availability_locks';
let collectionPromise: Promise<Collection<DiningAvailabilityLockDocument>> | null = null;

async function getCollection() {
  if (collectionPromise) return collectionPromise;
  collectionPromise = (async () => {
    const client = await getDatabaseClient();
    const collection = client.db(await getDatabaseName()).collection<DiningAvailabilityLockDocument>(COLLECTION);
    await collection.createIndex({ key: 1 }, { unique: true });
    return collection;
  })();
  return collectionPromise;
}

export async function touchDiningAvailabilityLock(roomId: string, bookingDate: string, session?: ClientSession) {
  const collection = await getCollection();
  await collection.updateOne(
    { key: `${roomId}:${bookingDate}` },
    { $set: { touchedAt: new Date() }, $setOnInsert: { key: `${roomId}:${bookingDate}` } },
    { upsert: true, session },
  );
}
