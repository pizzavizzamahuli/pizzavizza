import { Collection, ObjectId, ClientSession } from 'mongodb';
import { getDatabaseClient, getDatabaseName } from '@/src/config/database';

export type FulfillmentType = 'DELIVERY' | 'PICKUP';
export type OrderSource = 'ONLINE' | 'COUNTER';

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'PICKED_UP'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'REJECTED';

export type PaymentMethod = 'COD' | 'ONLINE' | 'MANUAL' | 'WALLET';
export type PaymentStatus = 'PENDING' | 'AWAITING_VERIFICATION' | 'PAID' | 'FAILED' | 'SUSPICIOUS' | 'REFUNDED';

export interface OrderItemOptionSnapshot {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  price: number;
}

export interface OrderItemSnapshot {
  productId: string;
  name: string;
  image?: string | null;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  customizationTotal?: number;
  selectedOptions?: OrderItemOptionSnapshot[];
}

export interface CustomerSnapshot {
  userId: string;
  name: string;
  email?: string | null;
  mobile?: string | null;
}

export interface AddressSnapshot {
  fullName: string;
  mobile: string;
  addressLine1: string;
  addressLine2?: string | null;
  landmark?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  googleMapsUrl?: string | null;
}

export interface OrderDocument {
  _id?: ObjectId;
  id?: string;
  orderNumber: string; // PV-2026-000001
  userId: string;
  customerSnapshot: CustomerSnapshot;
  items: OrderItemSnapshot[];
  fulfillmentType: FulfillmentType;
  orderSource?: OrderSource;
  tableNumber?: string | null;
  createdByUserId?: string | null;
  deliveryAddress?: AddressSnapshot | null;
  subtotal: number;
  deliveryCharge: number;
  additionalCharges: number;
  discount: number;
  staffDiscountAmount?: number;
  staffDiscountGiven?: boolean;
  staffDiscountReason?: string | null;
  walletAmount: number;
  totalAmount: number;
  paidAmount?: number;
  amountDue?: number;
  couponCode?: string | null;
  referralCode?: string | null;
  paymentMethod?: PaymentMethod | null;
  paymentStatus: PaymentStatus;
  transactionId?: string | null;
  paymentProofUrl?: string | null;
  razorpayOrderId?: string | null;
  razorpayPaymentId?: string | null;
  orderStatus: OrderStatus;
  customerNote?: string | null;
  reservationBookingNumber?: string | null;
  deliveryStaffId?: string | null;
  deliveryStaffName?: string | null;
  deliveryNote?: string | null;
  deliveryFailureReason?: string | null;
  deliveryDistance?: number | null;
  deliveryRadiusAtOrder?: number | null;
  deliveryRadiusUnitAtOrder?: 'KM' | 'MILES' | null;
  statusHistory?: Array<{ previousStatus?: string; newStatus: string; changedBy?: string; note?: string; createdAt: Date }>;
  idempotencyKey?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const ORDERS_COLLECTION = 'orders';

let ordersCollectionPromise: Promise<Collection<OrderDocument>> | null = null;

export async function getOrdersCollection() {
  if (ordersCollectionPromise) return ordersCollectionPromise;

  ordersCollectionPromise = (async () => {
    const client = await getDatabaseClient();
    const db = client.db(await getDatabaseName());
    const collection = db.collection<OrderDocument>(ORDERS_COLLECTION);
    await collection.createIndex({ orderNumber: 1 }, { unique: true });
    // allow optional idempotency key to be unique when present
    await collection.createIndex({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $exists: true } } });
    await collection.createIndex({ userId: 1 });
    await collection.createIndex({ createdAt: -1 });
    return collection;
  })();

  return ordersCollectionPromise;
}

export async function createOrder(doc: Partial<OrderDocument>, session?: ClientSession) {
  const col = await getOrdersCollection();
  const now = new Date();
  const toInsert: OrderDocument = {
    orderNumber: doc.orderNumber || '',
    userId: doc.userId || '',
    customerSnapshot: (doc.customerSnapshot as CustomerSnapshot) || { userId: '', name: '' },
    items: (doc.items as OrderItemSnapshot[]) || [],
    fulfillmentType: (doc.fulfillmentType as FulfillmentType) || 'DELIVERY',
    orderSource: doc.orderSource || 'ONLINE',
    tableNumber: doc.tableNumber ?? null,
    createdByUserId: doc.createdByUserId ?? null,
    deliveryAddress: doc.deliveryAddress || null,
    subtotal: doc.subtotal || 0,
    deliveryCharge: doc.deliveryCharge || 0,
    additionalCharges: doc.additionalCharges || 0,
    discount: doc.discount || 0,
    staffDiscountAmount: doc.staffDiscountAmount ?? 0,
    staffDiscountGiven: doc.staffDiscountGiven ?? false,
    staffDiscountReason: doc.staffDiscountReason ?? null,
    walletAmount: doc.walletAmount || 0,
    totalAmount: doc.totalAmount || 0,
    paidAmount: doc.paidAmount ?? (doc.paymentStatus === 'PAID' ? doc.totalAmount || 0 : 0),
    amountDue: doc.amountDue ?? (doc.paymentStatus === 'PAID' ? 0 : doc.totalAmount || 0),
    couponCode: doc.couponCode ?? null,
    referralCode: doc.referralCode ?? null,
    paymentMethod: doc.paymentMethod ?? null,
    paymentStatus: doc.paymentStatus || 'PENDING',
    transactionId: doc.transactionId ?? null,
    paymentProofUrl: doc.paymentProofUrl ?? null,
    razorpayOrderId: doc.razorpayOrderId ?? null,
    razorpayPaymentId: doc.razorpayPaymentId ?? null,
    orderStatus: doc.orderStatus || 'PENDING',
    customerNote: doc.customerNote ?? null,
    deliveryDistance: doc.deliveryDistance ?? null,
    deliveryRadiusAtOrder: doc.deliveryRadiusAtOrder ?? null,
    deliveryRadiusUnitAtOrder: doc.deliveryRadiusUnitAtOrder ?? null,
    statusHistory: doc.statusHistory || [],
    createdAt: now,
    updatedAt: now,
  } as OrderDocument;

  if (doc.idempotencyKey) {
    toInsert.idempotencyKey = doc.idempotencyKey;
  }

  const res = await col.insertOne(toInsert as OrderDocument, { session });
  return { ...toInsert, _id: res.insertedId, id: res.insertedId.toHexString() } as OrderDocument;
}

export async function findOrderByOrderNumber(orderNumber: string) {
  const col = await getOrdersCollection();
  return col.findOne({ orderNumber });
}

export async function updateOrderByOrderNumber(orderNumber: string, updates: Partial<OrderDocument>) {
  const col = await getOrdersCollection();
  const now = new Date();
  await col.updateOne({ orderNumber }, { $set: { ...updates, updatedAt: now } });
  return col.findOne({ orderNumber });
}

export async function assignDeliveryStaff(orderNumber: string, staffId: string | null, staffName: string | null, changedBy: string, expectedStaffId?: string | null) {
  const col = await getOrdersCollection();
  const current = await col.findOne({ orderNumber });
  if (!current) return null;
  if (current.fulfillmentType !== 'DELIVERY' || ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(current.orderStatus)) return null;
  const currentStaffId = current.deliveryStaffId || null;
  if (expectedStaffId !== undefined && currentStaffId !== expectedStaffId) return null;
  const now = new Date();
  return col.findOneAndUpdate(
    { orderNumber, deliveryStaffId: currentStaffId },
    { $set: { deliveryStaffId: staffId, deliveryStaffName: staffName, updatedAt: now }, $push: { statusHistory: { previousStatus: current.orderStatus, newStatus: current.orderStatus, changedBy, note: staffId ? `Delivery assigned to ${staffName}` : 'Delivery assignment released', createdAt: now } } },
    { returnDocument: 'after' },
  );
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export const validOrderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED', 'REJECTED'],
  CONFIRMED: ['PREPARING', 'CANCELLED'],
  PREPARING: ['READY', 'CANCELLED'],
  READY: ['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  PICKED_UP: ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['DELIVERED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
  REJECTED: [],
};

export function canTransitionOrderStatus(current: OrderStatus, next: OrderStatus) {
  return validOrderStatusTransitions[current]?.includes(next);
}

export async function searchOrders(term: string) {
  const col = await getOrdersCollection();
  const regex = new RegExp(escapeRegex(term.trim()), 'i');
  return col
    .find({
      $or: [
        { orderNumber: regex },
        { 'customerSnapshot.mobile': regex },
        { 'customerSnapshot.name': regex },
      ],
    })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
}

export async function updateOrderStatusByOrderNumber(orderNumber: string, status: OrderStatus, changedBy: string, note?: string) {
  const col = await getOrdersCollection();
  const current = await col.findOne({ orderNumber });
  if (!current || !canTransitionOrderStatus(current.orderStatus, status)) return null;
  const now = new Date();
  const result = await col.findOneAndUpdate(
    { orderNumber, orderStatus: current.orderStatus },
    { $set: { orderStatus: status, updatedAt: now }, $push: { statusHistory: { previousStatus: current.orderStatus, newStatus: status, changedBy, note: note || `Status updated to ${status}`, createdAt: now } } },
    { returnDocument: 'after' },
  );
  return result;
}

export async function listOrdersForUser(userId: string) {
  const col = await getOrdersCollection();
  return col.find({ userId }).sort({ createdAt: -1 }).toArray();
}

export async function listOrders(filter: Partial<OrderDocument> = {}, session?: ClientSession) {
  const col = await getOrdersCollection();
  return col.find(filter, { session }).sort({ createdAt: -1 }).toArray();
}
