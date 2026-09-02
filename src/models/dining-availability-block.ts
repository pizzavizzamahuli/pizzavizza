import { Collection, Filter, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export interface DiningAvailabilityBlockDocument {
  _id?: ObjectId;
  id?: string;
  roomId: string;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string | null;
  isActive: boolean;
  createdBy?: string | null;
  createdAt: Date;
}

const DINING_AVAILABILITY_BLOCK_COLLECTION = 'dining_availability_blocks';

let diningAvailabilityBlockCollectionPromise: Promise<Collection<DiningAvailabilityBlockDocument>> | null = null;

export async function getDiningAvailabilityBlockCollection() {
  if (diningAvailabilityBlockCollectionPromise) return diningAvailabilityBlockCollectionPromise;

  diningAvailabilityBlockCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<DiningAvailabilityBlockDocument>(DINING_AVAILABILITY_BLOCK_COLLECTION);
    await collection.createIndex({ roomId: 1, date: 1, startTime: 1, endTime: 1 });
    return collection;
  })();

  return diningAvailabilityBlockCollectionPromise;
}

export async function createDiningAvailabilityBlock(doc: Partial<DiningAvailabilityBlockDocument>) {
  const col = await getDiningAvailabilityBlockCollection();
  const now = new Date();
  const toInsert: DiningAvailabilityBlockDocument = {
    roomId: doc.roomId || '',
    date: doc.date || '',
    startTime: doc.startTime || '',
    endTime: doc.endTime || '',
    reason: doc.reason || null,
    isActive: doc.isActive ?? true,
    createdBy: doc.createdBy || null,
    createdAt: now,
  } as DiningAvailabilityBlockDocument;

  const res = await col.insertOne(toInsert as DiningAvailabilityBlockDocument);
  return { ...toInsert, _id: res.insertedId, id: res.insertedId.toHexString() } as DiningAvailabilityBlockDocument;
}

export async function findDiningAvailabilityBlockForRoom(roomId: string, date: string, startTime: string, durationMinutes: number, session?: import('mongodb').ClientSession) {
  const endTime = (() => {
    const [hours, mins] = startTime.split(':').map(Number);
    const start = new Date();
    start.setHours(hours, mins, 0, 0);
    const end = new Date(start.getTime() + durationMinutes * 60000);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${pad(end.getHours())}:${pad(end.getMinutes())}`;
  })();

  const col = await getDiningAvailabilityBlockCollection();
  const filter: Filter<DiningAvailabilityBlockDocument> = {
    roomId,
    date,
    isActive: true,
    $or: [
      { startTime: { $lt: endTime }, endTime: { $gt: startTime } },
      { startTime: { $eq: startTime } },
    ],
  };
  return col.findOne(filter, { session });
}

export async function listDiningAvailabilityBlocks(roomId: string) {
  const col = await getDiningAvailabilityBlockCollection();
  return col.find({ roomId }).sort({ date: 1, startTime: 1 }).toArray();
}

export async function disableDiningAvailabilityBlock(id: string) {
  const col = await getDiningAvailabilityBlockCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { isActive: false } });
  return col.findOne({ _id: new ObjectId(id) });
}
