import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export type DeliveryAuditEventType =
  | 'DELIVERY_ASSIGNED'
  | 'DELIVERY_UNASSIGNED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'PICKUP_READY'
  | 'PICKUP_COMPLETED';

export interface DeliveryAuditDocument {
  _id?: ObjectId;
  id?: string;
  orderId: string;
  event: DeliveryAuditEventType;
  performedBy?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const DELIVERY_AUDIT_COLLECTION = 'delivery_audit';

let deliveryAuditCollectionPromise: Promise<Collection<DeliveryAuditDocument>> | null = null;

export async function getDeliveryAuditCollection() {
  if (deliveryAuditCollectionPromise) return deliveryAuditCollectionPromise;

  deliveryAuditCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<DeliveryAuditDocument>(DELIVERY_AUDIT_COLLECTION);
    await collection.createIndex({ orderId: 1 });
    await collection.createIndex({ createdAt: -1 });
    return collection;
  })();

  return deliveryAuditCollectionPromise;
}

export async function createDeliveryAuditEvent(event: Partial<DeliveryAuditDocument>) {
  const col = await getDeliveryAuditCollection();
  const now = new Date();
  const toInsert: DeliveryAuditDocument = {
    orderId: event.orderId || '',
    event: event.event || 'DELIVERY_ASSIGNED',
    performedBy: event.performedBy ?? null,
    metadata: event.metadata ?? {},
    createdAt: now,
  } as DeliveryAuditDocument;

  const res = await col.insertOne(toInsert as DeliveryAuditDocument);
  return { ...toInsert, _id: res.insertedId, id: res.insertedId.toHexString() } as DeliveryAuditDocument;
}
