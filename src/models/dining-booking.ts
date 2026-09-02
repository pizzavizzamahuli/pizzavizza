import { Collection, ObjectId, ClientSession } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';
import { DiningRoomDocument } from '@/src/models/dining-room';
import { CustomerSnapshot } from '@/src/models/order';

export type DiningBookingStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';
export type DiningBookingPaymentStatus = 'PENDING' | 'AWAITING_VERIFICATION' | 'PAID' | 'FAILED' | 'SUSPICIOUS' | 'REFUNDED' | 'NOT_REQUIRED';

export interface DiningRoomSnapshot {
  roomId: string;
  roomType: string;
  name: string;
  slug: string;
  description?: string | null;
  shortDescription?: string | null;
  images: string[];
  capacityMin: number;
  capacityMax: number;
  roomCount: number;
  seatsPerRoom: number;
  pricingType: DiningRoomDocument['pricingType'];
  price: number;
  bookingDurationMinutes: number;
}

export interface DiningBookingDocument {
  _id?: ObjectId;
  id?: string;
  bookingNumber: string;
  idempotencyKey?: string | null;
  userId: string;
  roomId: string;
  roomSnapshot: DiningRoomSnapshot;
  customerSnapshot: CustomerSnapshot;
  bookingDate: string;
  startTime: string;
  endTime: string;
  guestCount: number;
  roomCount: number;
  durationMinutes: number;
  price: number;
  discount: number;
  couponCode?: string | null;
  staffDiscountAmount?: number;
  staffDiscountGiven?: boolean;
  staffDiscountReason?: string | null;
  finalAmount: number;
  paymentMethod?: 'ONLINE' | 'COD' | null;
  paymentStatus: DiningBookingPaymentStatus;
  transactionId?: string | null;
  paymentProofUrl?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  razorpaySignature?: string | null;
  bookingStatus: DiningBookingStatus;
  customerNote?: string | null;
  adminNote?: string | null;
  statusHistory: Array<{ previousStatus?: string; newStatus: string; performedBy?: string; note?: string; createdAt: Date }>;
  createdAt: Date;
  updatedAt: Date;
}

const DINING_BOOKINGS_COLLECTION = 'dining_bookings';

let diningBookingsCollectionPromise: Promise<Collection<DiningBookingDocument>> | null = null;

export async function getDiningBookingsCollection() {
  if (diningBookingsCollectionPromise) return diningBookingsCollectionPromise;

  diningBookingsCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<DiningBookingDocument>(DINING_BOOKINGS_COLLECTION);
    await collection.createIndex({ bookingNumber: 1 }, { unique: true });
    await collection.createIndex({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } });
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ roomId: 1 });
    await collection.createIndex({ bookingDate: 1, startTime: 1 });
    return collection;
  })();

  return diningBookingsCollectionPromise;
}

export async function findDiningBookingsForRoomOnDate(roomId: string, bookingDate: string, session?: ClientSession) {
  const col = await getDiningBookingsCollection();
  return col.find({ roomId, bookingDate, bookingStatus: { $nin: ['REJECTED', 'CANCELLED'] } }, { session }).toArray();
}

export async function createDiningBooking(doc: Partial<DiningBookingDocument>, session?: import('mongodb').ClientSession) {
  const col = await getDiningBookingsCollection();
  const now = new Date();
  const toInsert: DiningBookingDocument = {
    bookingNumber: doc.bookingNumber || '',
    idempotencyKey: doc.idempotencyKey ?? null,
    userId: doc.userId || '',
    roomId: doc.roomId || '',
    roomSnapshot: (doc.roomSnapshot as DiningRoomSnapshot) || ({} as DiningRoomSnapshot),
    customerSnapshot: (doc.customerSnapshot as CustomerSnapshot) || { userId: '', name: '' },
    bookingDate: doc.bookingDate || '',
    startTime: doc.startTime || '',
    endTime: doc.endTime || '',
    guestCount: doc.guestCount ?? 1,
    roomCount: doc.roomCount ?? 1,
    durationMinutes: doc.durationMinutes ?? 60,
    price: doc.price ?? 0,
    discount: doc.discount ?? 0,
    couponCode: doc.couponCode ?? null,
    staffDiscountAmount: doc.staffDiscountAmount ?? 0,
    staffDiscountGiven: doc.staffDiscountGiven ?? false,
    staffDiscountReason: doc.staffDiscountReason ?? null,
    finalAmount: doc.finalAmount ?? 0,
    paymentMethod: doc.paymentMethod ?? null,
    paymentStatus: doc.paymentStatus || 'PENDING',
    bookingStatus: doc.bookingStatus || 'PENDING',
    customerNote: doc.customerNote ?? null,
    adminNote: doc.adminNote ?? null,
    statusHistory: doc.statusHistory || [],
    createdAt: now,
    updatedAt: now,
  } as DiningBookingDocument;

  const res = await col.insertOne(toInsert as DiningBookingDocument, { session });
  return { ...toInsert, _id: res.insertedId, id: res.insertedId.toHexString() } as DiningBookingDocument;
}

export async function findDiningBookingByBookingNumber(bookingNumber: string) {
  const col = await getDiningBookingsCollection();
  return col.findOne({ bookingNumber });
}

export async function findDiningBookingById(id: string) {
  const col = await getDiningBookingsCollection();
  try {
    return await col.findOne({ _id: new ObjectId(id) });
  } catch {
    return null;
  }
}

export async function findDiningBookingByIdempotencyKey(idempotencyKey: string) {
  const col = await getDiningBookingsCollection();
  return col.findOne({ idempotencyKey });
}

export async function listDiningBookingsForUser(userId: string) {
  const col = await getDiningBookingsCollection();
  return col.find({ userId }).sort({ createdAt: -1 }).toArray();
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
}

export async function searchDiningBookings(term: string) {
  const col = await getDiningBookingsCollection();
  const regex = new RegExp(escapeRegex(term.trim()), 'i');
  return col
    .find({
      $or: [
        { bookingNumber: regex },
        { 'customerSnapshot.mobile': regex },
        { 'customerSnapshot.name': regex },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
}

export async function countDiningBookings(filter: Partial<DiningBookingDocument> = {}) {
  const col = await getDiningBookingsCollection();
  return col.countDocuments(filter);
}

export const validDiningBookingStatusTransitions: Record<DiningBookingStatus, DiningBookingStatus[]> = {
  PENDING: ['CONFIRMED', 'REJECTED', 'CANCELLED'],
  CONFIRMED: ['COMPLETED', 'NO_SHOW', 'CANCELLED'],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
  NO_SHOW: [],
};

export function canTransitionDiningBookingStatus(current: DiningBookingStatus, next: DiningBookingStatus) {
  return validDiningBookingStatusTransitions[current]?.includes(next);
}

export async function listDiningBookings(filter: Partial<DiningBookingDocument> = {}) {
  const col = await getDiningBookingsCollection();
  return col.find(filter).sort({ createdAt: -1 }).toArray();
}

export async function updateDiningBooking(id: string, updates: Partial<DiningBookingDocument>) {
  const col = await getDiningBookingsCollection();
  const now = new Date();
  await col.updateOne({ _id: new ObjectId(id) }, { $set: { ...updates, updatedAt: now } });
  return col.findOne({ _id: new ObjectId(id) });
}
