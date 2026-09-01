import { Collection, ObjectId, ClientSession } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export type CouponDiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type CouponScopeType = 'ALL' | 'CATEGORIES' | 'PRODUCTS' | 'FULFILLMENT';
export type CouponStatus = 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'DISABLED';

export interface CouponDocument {
  _id?: ObjectId;
  id?: string;
  code: string;
  description?: string | null;
  occasion?: string | null;
  discountType: CouponDiscountType;
  discountValue: number;
  minimumOrderAmount: number;
  maximumDiscount?: number | null;
  startAt: Date;
  endAt: Date;
  usageLimit?: number | null;
  usedCount: number;
  perUserLimit?: number | null;
  isActive: boolean;
  scopeType: CouponScopeType;
  scopeValues: string[];
  appliesToPickup: boolean;
  appliesToDelivery: boolean;
  paymentMethod?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const COUPONS_COLLECTION = 'coupons';

let couponsCollectionPromise: Promise<Collection<CouponDocument>> | null = null;

export async function getCouponsCollection() {
  if (couponsCollectionPromise) return couponsCollectionPromise;

  couponsCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<CouponDocument>(COUPONS_COLLECTION);
    await collection.createIndex({ code: 1 }, { unique: true });
    await collection.createIndex({ isActive: 1, startAt: 1, endAt: 1 });
    await collection.createIndex({ createdAt: -1 });
    return collection;
  })();

  return couponsCollectionPromise;
}

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase();
}

export async function findCouponByCode(code: string, session?: ClientSession) {
  const col = await getCouponsCollection();
  return col.findOne({ code: normalizeCouponCode(code) }, { session });
}

export async function findCouponById(id: string, session?: ClientSession) {
  const col = await getCouponsCollection();
  return col.findOne({ _id: new ObjectId(id) }, { session });
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function searchCoupons(search?: string) {
  const col = await getCouponsCollection();
  if (!search || !search.trim()) {
    return listCoupons();
  }
  const regex = new RegExp(escapeRegex(search.trim()), 'i');
  return col.find({ code: regex }).sort({ createdAt: -1 }).toArray();
}

export async function listCoupons(filter: Partial<CouponDocument> = {}) {
  const col = await getCouponsCollection();
  return col.find(filter).sort({ createdAt: -1 }).toArray();
}

export async function reserveCouponUsage(id: string, session?: ClientSession) {
  const col = await getCouponsCollection();
  const now = new Date();
  const filter = {
    _id: new ObjectId(id),
    isActive: true,
    startAt: { $lte: now },
    endAt: { $gte: now },
    $expr: {
      $or: [
        { $eq: ['$usageLimit', null] },
        { $lt: ['$usedCount', '$usageLimit'] },
      ],
    },
  };

  const result = await col.findOneAndUpdate(filter, { $inc: { usedCount: 1 }, $set: { updatedAt: now } }, { returnDocument: 'after', session });
  // `findOneAndUpdate` returns the updated document or null if no document matched.
  return result !== null;
}

export async function decrementCouponUsage(id: string, session?: ClientSession) {
  const col = await getCouponsCollection();
  const now = new Date();
  await col.updateOne({ _id: new ObjectId(id), usedCount: { $gt: 0 } }, { $inc: { usedCount: -1 }, $set: { updatedAt: now } }, { session });
}

export async function createCoupon(doc: Partial<CouponDocument>) {
  const col = await getCouponsCollection();
  const now = new Date();
  const normalizedCode = normalizeCouponCode((doc.code || '').trim());
  const existing = await findCouponByCode(normalizedCode);
  if (existing) throw new Error('Coupon code already exists');

  const toInsert: CouponDocument = {
    code: normalizedCode,
    description: doc.description || null,
    occasion: doc.occasion || null,
    discountType: doc.discountType || 'PERCENTAGE',
    discountValue: doc.discountValue ?? 0,
    minimumOrderAmount: doc.minimumOrderAmount ?? 0,
    maximumDiscount: doc.maximumDiscount ?? null,
    startAt: doc.startAt || now,
    endAt: doc.endAt || now,
    usageLimit: doc.usageLimit ?? null,
    usedCount: 0,
    perUserLimit: doc.perUserLimit ?? null,
    isActive: doc.isActive ?? true,
    scopeType: doc.scopeType || 'ALL',
    scopeValues: doc.scopeValues || [],
    appliesToPickup: doc.appliesToPickup ?? true,
    appliesToDelivery: doc.appliesToDelivery ?? true,
    paymentMethod: doc.paymentMethod ?? null,
    createdAt: now,
    updatedAt: now,
  } as CouponDocument;

  const res = await col.insertOne(toInsert as CouponDocument);
  return { ...toInsert, _id: res.insertedId, id: res.insertedId.toHexString() } as CouponDocument;
}

export async function updateCoupon(id: string, updates: Partial<CouponDocument>) {
  const col = await getCouponsCollection();
  const now = new Date();
  if (updates.code) {
    const normalizedCode = normalizeCouponCode(updates.code);
    const existing = await findCouponByCode(normalizedCode);
    if (existing && existing._id?.toHexString() !== id) throw new Error('Coupon code already exists');
    updates.code = normalizedCode;
  }
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { ...updates, updatedAt: now } });
  return findCouponById(id);
}

export async function incrementCouponUsage(id: string) {
  const col = await getCouponsCollection();
  await col.updateOne({ _id: new ObjectId(id) }, { $inc: { usedCount: 1 }, $set: { updatedAt: new Date() } });
  return findCouponById(id);
}

export function getCouponStatus(coupon: CouponDocument, now = new Date()): CouponStatus {
  if (!coupon.isActive) return 'DISABLED';
  if (now < coupon.startAt) return 'SCHEDULED';
  if (now > coupon.endAt) return 'EXPIRED';
  return 'ACTIVE';
}
