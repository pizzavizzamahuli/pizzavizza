import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { createOrderForUser } from '@/src/services/order-service';
import { createRazorpayOrder } from '@/src/services/razorpay-service';

type CheckoutPayload = {
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  addressId?: string | null;
  items?: Array<{ productId: string; quantity: number; selectedOptionIds?: string[]; selectedOptions?: Array<{ optionId: string }> }>;
  customerNote?: string | null;
  couponCode?: string | null;
  walletAmount?: number | null;
  referralCode?: string | null;
  paymentMethod?: string | null;
  transactionId?: string | null;
  paymentProofUrl?: string | null;
};

type CreatedOrder = {
  id?: string;
  orderNumber?: string;
  subtotal?: number;
  discount?: number;
  walletAmount?: number;
  totalAmount?: number;
  paymentMethod?: string | null;
  paymentStatus?: string;
};

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    try {
      const { env } = await import('@/src/config/env');
      if (env.ENABLE_REQUEST_LOG) {
        const hdrs = Object.fromEntries(Array.from(request.headers.entries()));
        const cookie = request.headers.get('cookie');
        const tokenHeader = request.headers.get('x-pizzavizza-session') || request.headers.get('x-session-token');
        console.warn('[request-log] unauthenticated checkout POST', { headers: hdrs, cookie, tokenHeader });
      }
    } catch {
      // ignore
    }
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  try {
    const payload = (await request.json()) as unknown as CheckoutPayload;
    const { fulfillmentType, addressId, items, customerNote, couponCode, walletAmount, referralCode, paymentMethod, transactionId, paymentProofUrl } = payload;
    if (!fulfillmentType) return NextResponse.json({ error: 'fulfillmentType is required' }, { status: 400 });
    const idempotencyKey = (request.headers.get('Idempotency-Key') || request.headers.get('idempotency-key') || null) as string | null;
    const order = await createOrderForUser(user._id!.toHexString(), { items: items || [], fulfillmentType, addressId, customerNote, couponCode, walletAmount, referralCode, paymentMethod, transactionId, paymentProofUrl, idempotencyKey });
    const ord = order as CreatedOrder;

    // If online payment requested, create a Razorpay order and return details required by client
    if (ord.paymentMethod === 'ONLINE' && ord.paymentStatus === 'PENDING') {
      try {
        const amountPaise = Math.round((ord.totalAmount || 0) * 100);
        const rpOrder = await createRazorpayOrder(amountPaise, ord.orderNumber || String(ord.id || ''));
        return NextResponse.json({ success: true, data: { orderId: ord.id, orderNumber: ord.orderNumber, subtotal: ord.subtotal, discount: ord.discount, walletAmount: ord.walletAmount, totalAmount: ord.totalAmount, razorpay: { keyId: process.env.RAZORPAY_KEY_ID || null, order: rpOrder } } });
      } catch (e) {
        console.error('createRazorpayOrder failed', e);
        // return order creation success but indicate payment creation failed
        return NextResponse.json({ success: true, data: { orderId: ord.id, orderNumber: ord.orderNumber, subtotal: ord.subtotal, discount: ord.discount, walletAmount: ord.walletAmount, totalAmount: ord.totalAmount, razorpayError: (e instanceof Error ? e.message : String(e)) } });
      }
    }

    return NextResponse.json({ success: true, data: { orderId: ord.id, orderNumber: ord.orderNumber, subtotal: ord.subtotal, discount: ord.discount, walletAmount: ord.walletAmount, totalAmount: ord.totalAmount } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || 'Failed to create order' }, { status: 400 });
  }
}
