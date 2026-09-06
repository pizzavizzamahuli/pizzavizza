import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export interface PushSubscriptionDocument {
  _id?: ObjectId;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  userAgent?: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt?: Date | null;
}

let collectionPromise: Promise<Collection<PushSubscriptionDocument>> | null = null;

export async function getPushSubscriptionsCollection() {
  if (collectionPromise) return collectionPromise;
  collectionPromise = (async () => {
    const db = (await getDatabaseClient()).db(await getDatabaseName());
    const collection = db.collection<PushSubscriptionDocument>('push_subscriptions');
    await collection.createIndex({ userId: 1, updatedAt: -1 });
    await collection.createIndex({ endpoint: 1 }, { unique: true });
    return collection;
  })();
  return collectionPromise;
}

export async function upsertPushSubscription(input: Omit<PushSubscriptionDocument, '_id' | 'createdAt' | 'updatedAt'>) {
  const collection = await getPushSubscriptionsCollection();
  const now = new Date();
  await collection.updateOne(
    { endpoint: input.endpoint },
    { $set: { ...input, updatedAt: now }, $setOnInsert: { createdAt: now } },
    { upsert: true },
  );
}

export async function listPushSubscriptions(userId: string) {
  return (await getPushSubscriptionsCollection()).find({ userId }).toArray();
}

export async function removePushSubscription(userId: string, endpoint: string) {
  return (await getPushSubscriptionsCollection()).deleteOne({ userId, endpoint });
}

export async function removePushSubscriptionByEndpoint(endpoint: string) {
  return (await getPushSubscriptionsCollection()).deleteOne({ endpoint });
}

export async function touchPushSubscription(endpoint: string) {
  return (await getPushSubscriptionsCollection()).updateOne({ endpoint }, { $set: { lastUsedAt: new Date() } });
}