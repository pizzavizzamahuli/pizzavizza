import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export type NotificationAudience = 'USER' | 'ADMIN';

export interface NotificationDocument {
  _id?: ObjectId;
  recipientId: string;
  audience: NotificationAudience;
  type: string;
  title: string;
  message: string;
  href?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  permission?: string | null;
  eventKey: string;
  readAt?: Date | null;
  createdAt: Date;
}

const COLLECTION = 'notifications';
let collectionPromise: Promise<Collection<NotificationDocument>> | null = null;

export async function getNotificationsCollection() {
  if (collectionPromise) return collectionPromise;
  collectionPromise = (async () => {
    const db = (await getDatabaseClient()).db(await getDatabaseName());
    const collection = db.collection<NotificationDocument>(COLLECTION);
    await collection.createIndex({ recipientId: 1, createdAt: -1 });
    await collection.createIndex({ recipientId: 1, readAt: 1 });
    await collection.createIndex({ recipientId: 1, eventKey: 1 }, { unique: true });
    return collection;
  })();
  return collectionPromise;
}

export async function createNotification(input: Omit<NotificationDocument, '_id' | 'createdAt' | 'readAt'>) {
  const collection = await getNotificationsCollection();
  const document: NotificationDocument = { ...input, readAt: null, createdAt: new Date() };
  try {
    await collection.insertOne(document);
    return document;
  } catch (error: unknown) {
    if (error instanceof Error && /duplicate|E11000/i.test(error.message)) return null;
    throw error;
  }
}

export async function listNotifications(recipientId: string, limit = 50) {
  const collection = await getNotificationsCollection();
  return collection.find({ recipientId }).sort({ createdAt: -1 }).limit(Math.min(Math.max(limit, 1), 100)).toArray();
}

export async function countUnreadNotifications(recipientId: string) {
  const collection = await getNotificationsCollection();
  return collection.countDocuments({ recipientId, readAt: null });
}

export async function markNotificationRead(id: string, recipientId: string) {
  const collection = await getNotificationsCollection();
  return collection.updateOne({ _id: new ObjectId(id), recipientId }, { $set: { readAt: new Date() } });
}

export async function markAllNotificationsRead(recipientId: string) {
  const collection = await getNotificationsCollection();
  return collection.updateMany({ recipientId, readAt: null }, { $set: { readAt: new Date() } });
}
