import { Collection, ObjectId, ClientSession } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export interface ReferralDocument {
  _id?: ObjectId;
  id?: string;
  code: string;
  referrerUserId: ObjectId | string;
  referredUserId?: ObjectId | string | null;
  rewardType: 'CREDIT' | 'DISCOUNT';
  rewardValue: number;
  rewardCurrency?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  redeemedAt?: Date | null;
  creditedAt?: Date | null;
  status: 'PENDING' | 'REDEEMED' | 'EXPIRED' | 'DISABLED';
}

const REFERRALS_COLLECTION = 'referrals';

let referralCollectionPromise: Promise<Collection<ReferralDocument>> | null = null;

export async function getReferralsCollection() {
  if (referralCollectionPromise) return referralCollectionPromise;

  referralCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<ReferralDocument>(REFERRALS_COLLECTION);
    await collection.createIndex({ code: 1 }, { unique: true });
    await collection.createIndex({ referrerUserId: 1 });
    await collection.createIndex({ referredUserId: 1 });
    return collection;
  })();

  return referralCollectionPromise;
}

export function generateReferralCode(userId: string) {
  const prefix = 'PZV';
  const hash = Buffer.from(`${userId}:${Date.now()}`).toString('base64').replace(/[^A-Z0-9]/g, '').slice(0, 6).toUpperCase();
  return `${prefix}${hash}`;
}

export async function findReferralByCode(code: string, session?: ClientSession) {
  const col = await getReferralsCollection();
  return col.findOne({ code: code.toUpperCase() }, { session });
}

export async function createReferral(referrerUserId: string, rewardValue = 50) {
  const col = await getReferralsCollection();
  const code = generateReferralCode(referrerUserId);
  const now = new Date();
  const doc: ReferralDocument = {
    code,
    referrerUserId,
    rewardType: 'CREDIT',
    rewardValue,
    rewardCurrency: 'INR',
    isActive: true,
    createdAt: now,
    updatedAt: now,
    status: 'PENDING',
  };
  await col.insertOne(doc as ReferralDocument);
  return doc;
}

export async function findReferralByUser(userId: string) {
  const col = await getReferralsCollection();
  return col.findOne({ referrerUserId: userId });
}

export async function listReferrals() {
  const col = await getReferralsCollection();
  return col.find({}).sort({ createdAt: -1 }).toArray();
}

export async function markReferralRedeemed(code: string, referredUserId: string, session?: ClientSession) {
  const col = await getReferralsCollection();
  return col.updateOne(
    { code: code.toUpperCase(), status: 'PENDING' },
    { $set: { referredUserId, status: 'REDEEMED', redeemedAt: new Date(), updatedAt: new Date() } },
    { session },
  );
}
