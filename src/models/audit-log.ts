import { Collection, ObjectId } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export interface AuditLogDocument {
  _id?: ObjectId;
  type: string;
  performedBy?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: Date;
}

const AUDIT_LOG_COLLECTION = 'audit_logs';

let auditCollectionPromise: Promise<Collection<AuditLogDocument>> | null = null;

export async function getAuditLogCollection() {
  if (auditCollectionPromise) return auditCollectionPromise;

  auditCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const col = db.collection<AuditLogDocument>(AUDIT_LOG_COLLECTION);
    await col.createIndex({ timestamp: -1 });
    return col;
  })();

  return auditCollectionPromise;
}

export async function recordAudit(entry: Partial<AuditLogDocument>) {
  const col = await getAuditLogCollection();
  const now = new Date();
  const toInsert: AuditLogDocument = {
    type: entry.type || 'UNKNOWN',
    performedBy: entry.performedBy ?? null,
    oldValue: entry.oldValue ?? null,
    newValue: entry.newValue ?? null,
    timestamp: now,
  };
  await col.insertOne(toInsert);
  return true;
}
