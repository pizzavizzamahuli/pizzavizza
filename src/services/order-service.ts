import { createHash } from 'node:crypto';
import { findCartByUserId, clearCart } from '@/src/models/cart';
import { findProductById } from '@/src/models/product';
import { createOrder, OrderDocument, OrderItemSnapshot, getOrdersCollection } from '@/src/models/order';
import { getNextSequence } from '@/src/models/counter';
import { getUserById } from '@/src/services/user-service';
import { findAddressById } from '@/src/models/address';
import type { ClientSession } from 'mongodb';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { checkDeliveryEligibilityAsync } from '@/src/services/delivery-service';
import { calculatePromotions, finalizeReferralReward } from '@/src/services/promo-service';
import { normalizePaymentMethod, resolveInitialPaymentState } from '@/src/services/payment-service';
import { adjustWalletBalance } from '@/src/models/wallet';
import { reserveCouponUsage } from '@/src/models/coupon';
import { getDatabaseClient } from '@/src/config/database';
import { calculateCustomizationForProduct, getEffectiveProductPrice } from '@/src/services/customization-service';
import { findDiningBookingByBookingNumber } from '@/src/models/dining-booking';

export type OrderItemPayload = {
  productId: string;
  quantity: number;
  selectedOptionIds?: string[];
};

export async function formatOrderNumber(session?: ClientSession) {
  const seq = await getNextSequence('orders', session);
  const year = new Date().getFullYear();
  const num = String(seq).padStart(6, '0');
  return `PV-${year}-${num}`;
}

function normalizeOrderItemForIdempotency(item: { productId?: string; quantity?: number; selectedOptionIds?: string[]; selectedOptions?: Array<{ optionId?: string }> }) {
  const productId = String(item.productId || '').trim();
  const selectedOptionIds = Array.isArray(item.selectedOptionIds)
    ? item.selectedOptionIds.map((id) => String(id)).filter(Boolean)
    : Array.isArray(item.selectedOptions)
      ? item.selectedOptions.map((opt) => String(opt.optionId || '')).filter(Boolean)
      : [];

  return {
    productId,
    quantity: Number(item.quantity || 1),
    selectedOptionIds: Array.from(new Set(selectedOptionIds)).sort(),
  };
}

export function buildOrderIdempotencyKey(userId: string, opts: { items?: Array<{ productId: string; quantity: number; selectedOptionIds?: string[]; selectedOptions?: Array<{ optionId: string }> }>; fulfillmentType: 'DELIVERY' | 'PICKUP'; addressId?: string | null; customerNote?: string | null; couponCode?: string | null; walletAmount?: number | null; referralCode?: string | null; paymentMethod?: string | null }) {
  const normalizedItems = (opts.items || []).map((item) => normalizeOrderItemForIdempotency(item));
  const payload = {
    userId,
    fulfillmentType: opts.fulfillmentType,
    addressId: opts.addressId || null,
    customerNote: opts.customerNote || null,
    couponCode: opts.couponCode || null,
    walletAmount: Number(opts.walletAmount || 0),
    referralCode: opts.referralCode || null,
    paymentMethod: normalizePaymentMethod(opts.paymentMethod ?? 'COD'),
    items: normalizedItems.sort((a, b) => a.productId.localeCompare(b.productId) || String(a.quantity).localeCompare(String(b.quantity))),
  };

  return `checkout:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
}

export async function calculateOrderTotals(items: OrderItemPayload[]) {
  let subtotal = 0;
  const itemSnapshots: Array<OrderItemSnapshot> = [];

  for (const it of items) {
    const product = await findProductById(it.productId);
    if (!product) throw new Error(`Product ${it.productId} not found`);
    if (!product.isAvailable) throw new Error(`Product ${product.name} is not available`);

    const quantity = Math.max(1, Math.floor(it.quantity));
    const customization = await calculateCustomizationForProduct(product, it.selectedOptionIds || []);
    const basePrice = getEffectiveProductPrice(product);
    const unitPrice = basePrice + customization.customizationTotal;
    const line = unitPrice * quantity;

    subtotal += line;
    itemSnapshots.push({
      productId: it.productId,
      name: product.name,
      image: product.image || null,
      unitPrice,
      quantity,
      subtotal: line,
      customizationTotal: customization.customizationTotal,
      selectedOptions: customization.selectedOptions,
    });
  }

  const deliveryCharge = 0;
  const additionalCharges = 0;
  const discount = 0;
  const walletAmount = 0;

  const total = subtotal + deliveryCharge + additionalCharges - discount - walletAmount;

  return { subtotal, deliveryCharge, additionalCharges, discount, walletAmount, total, itemSnapshots };
}

export async function createOrderForUser(userId: string, opts: { items?: Array<{ productId: string; quantity: number; selectedOptionIds?: string[]; selectedOptions?: Array<{ optionId: string }> }>; fulfillmentType: 'DELIVERY' | 'PICKUP'; addressId?: string | null; customerNote?: string | null; reservationBookingNumber?: string | null; couponCode?: string | null; walletAmount?: number | null; referralCode?: string | null; paymentMethod?: string | null; transactionId?: string | null; paymentProofUrl?: string | null; idempotencyKey?: string | null }) {
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const settings = await getRestaurantSettings();
  if (opts.reservationBookingNumber) {
    const reservation = await findDiningBookingByBookingNumber(opts.reservationBookingNumber);
    if (!reservation || reservation.userId !== userId || ['CANCELLED', 'REJECTED', 'COMPLETED', 'NO_SHOW'].includes(reservation.bookingStatus)) {
      throw new Error('This dining reservation is not available for food orders.');
    }
  }
  const requestedPaymentMethod = normalizePaymentMethod(opts.paymentMethod ?? 'COD');
  const client = await getDatabaseClient();
  let order: OrderDocument | null = null;
  const session = client.startSession();

  const cart = await findCartByUserId(userId);
  const itemsSource = opts.items && opts.items.length ? opts.items : (cart?.items ?? []);
  const effectiveIdempotencyKey = opts.idempotencyKey || buildOrderIdempotencyKey(userId, { ...opts, items: itemsSource as Array<{ productId: string; quantity: number; selectedOptionIds?: string[]; selectedOptions?: Array<{ optionId: string }> }> });

  // If the same checkout payload is submitted again, return the original order.
  const ordersCol = await getOrdersCollection();
  const existingOrder = await ordersCol.findOne({ idempotencyKey: effectiveIdempotencyKey });
  if (existingOrder) return existingOrder as OrderDocument;

  const runOrderFlow = async (activeSession?: typeof session) => {
    const cart = await findCartByUserId(userId, activeSession);
    const itemsSource = opts.items && opts.items.length ? opts.items : (cart?.items ?? []);
    if (!itemsSource || itemsSource.length === 0) throw new Error('Cart is empty');

    const normalizedItems = (itemsSource as Array<Record<string, unknown>>).map((item) => ({
      productId: String(item.productId || ''),
      quantity: typeof item.quantity === 'number' ? item.quantity : Number(item.quantity || 1),
      selectedOptionIds: Array.isArray(item.selectedOptions)
        ? (item.selectedOptions as Array<Record<string, unknown>>)
            .map((opt) => String(opt.optionId || opt.optionId || ''))
            .filter(Boolean)
        : Array.isArray(item.selectedOptionIds)
        ? (item.selectedOptionIds as string[]).map((id) => String(id)).filter(Boolean)
        : [],
    })) as OrderItemPayload[];

    const orderCalc = await calculateOrderTotals(normalizedItems);
    let addressSnapshotTransaction = null;
    let deliveryDistanceTransaction: number | null = null;
    let deliveryRadiusAtOrderTransaction: number | null = null;
    let deliveryRadiusUnitAtOrderTransaction: 'KM' | 'MILES' | null = null;

    if (opts.fulfillmentType === 'DELIVERY') {
      if (!settings.deliveryEnabled) {
        throw new Error('Delivery is currently unavailable');
      }
      if (!opts.addressId) throw new Error('Delivery address required');
      const addr = await findAddressById(opts.addressId);
      if (!addr) throw new Error('Address not found');
      addressSnapshotTransaction = {
        fullName: addr.fullName,
        mobile: addr.mobile,
        addressLine1: addr.addressLine1,
        addressLine2: addr.addressLine2 || null,
        landmark: addr.landmark || null,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: addr.country,
        latitude: typeof addr.latitude === 'number' ? addr.latitude : null,
        longitude: typeof addr.longitude === 'number' ? addr.longitude : null,
        googleMapsUrl: addr.googleMapsUrl || null,
      };
      const eligibility = await checkDeliveryEligibilityAsync(addr, settings, orderCalc.subtotal);
      if (!eligibility.eligible) {
        throw new Error(eligibility.reasonMessage || 'Delivery not available for this address');
      }
      orderCalc.deliveryCharge = eligibility.deliveryCharge;
      orderCalc.total = orderCalc.subtotal + orderCalc.deliveryCharge + orderCalc.additionalCharges - orderCalc.discount - orderCalc.walletAmount;
      deliveryDistanceTransaction = typeof eligibility.distance === 'number' ? eligibility.distance : null;
      deliveryRadiusAtOrderTransaction = typeof settings.deliveryRadius === 'number' ? settings.deliveryRadius : null;
      deliveryRadiusUnitAtOrderTransaction = settings.deliveryRadiusUnit || null;
    }

    if (opts.fulfillmentType === 'PICKUP' && !settings.pickupEnabled) {
      throw new Error('Pickup is currently unavailable');
    }

    if (requestedPaymentMethod === 'COD' && !settings.codEnabled) {
      throw new Error('Cash on delivery is currently unavailable');
    }

    if (requestedPaymentMethod === 'ONLINE' && !settings.onlinePaymentEnabled) {
      throw new Error('Online payment is currently unavailable');
    }

    if (requestedPaymentMethod === 'MANUAL' && !settings.manualPaymentEnabled) {
      throw new Error('Manual payment is currently unavailable');
    }

    const promo = await calculatePromotions(
      {
        userId,
        subtotal: orderCalc.subtotal,
        deliveryCharge: orderCalc.deliveryCharge,
        additionalCharges: orderCalc.additionalCharges,
        fulfillmentType: opts.fulfillmentType,
        couponCode: opts.couponCode || null,
        walletAmount: opts.walletAmount || null,
        referralCode: opts.referralCode || null,
        paymentMethod: requestedPaymentMethod,
      },
      activeSession,
    );

    orderCalc.discount = promo.discountAmount;
    orderCalc.walletAmount = promo.walletAmountUsed;
    orderCalc.total = orderCalc.subtotal + orderCalc.deliveryCharge + orderCalc.additionalCharges - orderCalc.discount - orderCalc.walletAmount;

    if (promo.coupon && promo.coupon._id) {
      const reserved = await reserveCouponUsage(promo.coupon._id.toHexString(), activeSession);
      if (!reserved) {
        throw new Error('Coupon usage limit reached');
      }
    }

    const paymentState = resolveInitialPaymentState(requestedPaymentMethod, orderCalc.total, promo.walletAmountUsed);

    async function createOrderWithUniqueNumber(orderData: Partial<OrderDocument>) {
      const maxAttempts = 5;
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        const nextOrderNumber = await formatOrderNumber(activeSession);
        try {
          return await createOrder({ ...orderData, orderNumber: nextOrderNumber, idempotencyKey: opts.idempotencyKey ?? null }, activeSession);
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : String(error || '');
          if (/duplicate.*orderNumber|E11000|duplicate key/i.test(message)) {
            if (attempt === maxAttempts - 1) {
              throw new Error('Unable to generate unique order number, please try again');
            }
            continue;
          }
          throw error;
        }
      }
      throw new Error('Unable to generate unique order number, please try again');
    }

    order = await createOrderWithUniqueNumber({
      userId,
      customerSnapshot: { userId, name: user.name, email: user.email, mobile: user.mobile },
      items: orderCalc.itemSnapshots,
      fulfillmentType: opts.fulfillmentType,
      deliveryAddress: addressSnapshotTransaction,
      subtotal: orderCalc.subtotal,
      deliveryCharge: orderCalc.deliveryCharge,
      deliveryDistance: deliveryDistanceTransaction ?? null,
      deliveryRadiusAtOrder: deliveryRadiusAtOrderTransaction ?? null,
      deliveryRadiusUnitAtOrder: deliveryRadiusUnitAtOrderTransaction ?? null,
      additionalCharges: orderCalc.additionalCharges,
      discount: orderCalc.discount,
      walletAmount: orderCalc.walletAmount,
      totalAmount: orderCalc.total,
      couponCode: promo.couponCode,
      referralCode: promo.referralCode,
      paymentMethod: paymentState.paymentMethod,
      paymentStatus: paymentState.paymentStatus,
      transactionId: requestedPaymentMethod === 'MANUAL' ? (opts.transactionId || null) : null,
      paymentProofUrl: requestedPaymentMethod === 'MANUAL' ? (opts.paymentProofUrl || null) : null,
      orderStatus: 'PENDING',
      customerNote: opts.customerNote ?? null,
      reservationBookingNumber: opts.reservationBookingNumber ?? null,
      idempotencyKey: effectiveIdempotencyKey,
    });

    if (promo.walletAmountUsed > 0) {
      await adjustWalletBalance(userId, -promo.walletAmountUsed, 'Order payment', order.orderNumber, 'DEBIT', activeSession);
    }

    if (promo.referralApplied && promo.referralCode) {
      await finalizeReferralReward(order.orderNumber, userId, promo.referralCode, activeSession);
    }

    await clearCart(userId, activeSession);
  };

  try {
    await session.withTransaction(async () => {
      await runOrderFlow(session);
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const shouldFallback = /replica set|transaction numbers|transactions|transaction.*aborted/i.test(message);
    if (shouldFallback) {
      await runOrderFlow();
    } else {
      throw err;
    }
  } finally {
    await session.endSession();
  }

  if (!order) {
    throw new Error('Failed to create order');
  }

  // Notify admins via telegram (best-effort)
  try {
    const { notifyNewOrder } = await import('@/src/services/telegram-service');
    notifyNewOrder(order).catch((e) => console.error('notifyNewOrder failed', e));
  } catch (err) {
    console.error('Failed to dispatch telegram notifyNewOrder', err);
  }

  return order;
}
