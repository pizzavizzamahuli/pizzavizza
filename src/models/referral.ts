import { Collection, ObjectId, ClientSession } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

async function assertReferralEnabled() {
  const settings = await getRestaurantSettings();
  if (settings.referralEnabled !== true) throw new Error('Referral programme is currently unavailable');
}

export interface ReferralDocument {
  _id?: ObjectId;
  id?: string;
  code: string;
  referrerUserId: ObjectId | string;
  referredUserId?: ObjectId | string | null;
  rewardType: 'CREDIT' | 'DISCOUNT';
  rewardValue: number;
  referrerRewardAmount?: number;
  referredRewardAmount?: number;
  qualifyingOrderId?: string | null;
  qualifyingOrderAmount?: number | null;
  qualifiedAt?: Date | null;
  referrerRewardCreditedAt?: Date | null;
  referredRewardCreditedAt?: Date | null;
  rewardCurrency?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  redeemedAt?: Date | null;
  creditedAt?: Date | null;
  status: 'PENDING' | 'QUALIFIED' | 'REWARDED' | 'REDEEMED' | 'EXPIRED' | 'DISABLED';
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
    try {
      await collection.createIndex({ referrerUserId: 1 }, { unique: true });
    } catch (error) {
      console.warn('Could not create unique referral owner index:', error);
    }
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
  if ((await getRestaurantSettings()).referralEnabled !== true) return null;
  const col = await getReferralsCollection();
  return col.findOne({ code: code.toUpperCase() }, { session });
}

export async function createReferral(referrerUserId: string, rewardValue = 50) {
  await assertReferralEnabled();
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
  try {
    await col.insertOne(doc as ReferralDocument);
  } catch (error: unknown) {
    if (!/duplicate|E11000/i.test(error instanceof Error ? error.message : String(error))) throw error;
    const existing = await col.findOne({ referrerUserId });
    if (existing) return existing;
  }
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
  await assertReferralEnabled();
  const col = await getReferralsCollection();
  return col.updateOne(
    { code: code.toUpperCase(), status: 'PENDING' },
    { $set: { referredUserId, status: 'REDEEMED', redeemedAt: new Date(), updatedAt: new Date() } },
    { session },
  );
}

export async function reserveReferralForUser(code: string, referredUserId: string) {
  await assertReferralEnabled();
  const col = await getReferralsCollection();
  return col.updateOne(
    { code: code.toUpperCase(), status: 'PENDING', $or: [{ referredUserId: { $exists: false } }, { referredUserId: null }, { referredUserId }] },
    { $set: { referredUserId, updatedAt: new Date() } },
  );
}

export async function creditReferralRewards(code: string, referredUserId: string, session?: ClientSession) {
  await assertReferralEnabled();
  const col = await getReferralsCollection();
  const referral = await col.findOneAndUpdate(
    { code: code.toUpperCase(), status: 'PENDING', referrerUserId: { $ne: referredUserId } },
    { $set: { referredUserId, status: 'REDEEMED', redeemedAt: new Date(), creditedAt: new Date(), updatedAt: new Date() } },
    { session, returnDocument: 'after' },
  );
  if (!referral) return false;
  return referral;
}

export async function qualifyReferral(code: string, referredUserId: string, orderNumber: string, orderAmount: number, referrerRewardAmount: number, referredRewardAmount: number, session?: ClientSession) {
  await assertReferralEnabled();
  const col = await getReferralsCollection();
  return col.findOneAndUpdate(
    { code: code.toUpperCase(), referredUserId, status: 'PENDING', qualifyingOrderId: { $in: [null, undefined] } },
    { $set: { status: 'QUALIFIED', qualifyingOrderId: orderNumber, qualifyingOrderAmount: orderAmount, referrerRewardAmount, referredRewardAmount, qualifiedAt: new Date(), updatedAt: new Date() } },
    { session, returnDocument: 'after' },
  );
}

export async function markReferralRewarded(code: string, referredUserId: string, session?: ClientSession) {
  await assertReferralEnabled();
  const col = await getReferralsCollection();
  return col.updateOne({ code: code.toUpperCase(), referredUserId, status: 'QUALIFIED' }, { $set: { status: 'REWARDED', creditedAt: new Date(), referrerRewardCreditedAt: new Date(), referredRewardCreditedAt: new Date(), updatedAt: new Date() } }, { session });
}
