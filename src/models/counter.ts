import { Collection } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

const COUNTERS_COLLECTION = 'counters';

let countersCollectionPromise: Promise<Collection> | null = null;

export async function getCountersCollection() {
  if (countersCollectionPromise) return countersCollectionPromise;

  countersCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection(COUNTERS_COLLECTION);
    await collection.createIndex({ key: 1 }, { unique: true });
    return collection;
  })();

  return countersCollectionPromise;
}

import type { ClientSession } from 'mongodb';

export async function getNextSequence(key: string, session?: ClientSession) {
  const col = await getCountersCollection();
  const res = await col.findOneAndUpdate(
    { key } as unknown as Record<string, unknown>,
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' as const, session },
  );

  const rawSeq =
    (res && typeof res === 'object' && 'seq' in res ? (res as Record<string, unknown>).seq : undefined) ??
    (res && typeof res === 'object' && 'value' in res && res.value && typeof res.value === 'object' && 'seq' in res.value ? (res.value as Record<string, unknown>).seq : undefined) ??
    1;

  const seq = Number(rawSeq);
  return Number.isFinite(seq) ? seq : 1;
}
