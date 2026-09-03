import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { getRazorpayOrder, verifyRazorpaySignature } from '@/src/services/razorpay-service';
import { updateOrderByOrderNumber } from '@/src/models/order';
import { findOrderByOrderNumber } from '@/src/models/order';
import { notifyUser } from '@/src/services/notification-service';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const payload = await request.json();
    const { orderNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload as Record<string, string>;
    if (!orderNumber || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const order = await findOrderByOrderNumber(orderNumber);
    if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    if (order.userId !== user._id?.toHexString()) return NextResponse.json({ error: 'This order does not belong to the signed-in user.' }, { status: 403 });
    if (order.paymentStatus === 'PAID') return NextResponse.json({ success: true, data: { order, alreadyPaid: true } });
    if (order.razorpayOrderId !== razorpayOrderId) return NextResponse.json({ error: 'Payment order does not match this order.' }, { status: 400 });

    const valid = await verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) {
      await updateOrderByOrderNumber(orderNumber, { paymentStatus: 'FAILED' });
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    const razorpayOrder = await getRazorpayOrder(razorpayOrderId);
    const expectedAmount = Math.round(Number(order.totalAmount) * 100);
    if (razorpayOrder.id !== razorpayOrderId || razorpayOrder.currency !== 'INR' || razorpayOrder.amount !== expectedAmount) {
      return NextResponse.json({ error: 'Payment amount does not match this order.' }, { status: 400 });
    }

    // mark order as PAID
    const updated = await updateOrderByOrderNumber(orderNumber, { paymentStatus: 'PAID', paymentMethod: 'ONLINE', razorpayPaymentId });
    if (updated) notifyUser(updated.userId, { type: 'PAYMENT_APPROVED', title: 'Payment approved', message: `Payment for order ${updated.orderNumber} was approved.`, href: `/account/orders/${updated.orderNumber}`, relatedType: 'order', relatedId: updated.orderNumber, eventKey: `order:${updated.orderNumber}:payment:approved` }).catch((error) => console.error('Payment notification failed', error));

    // notify admins (best-effort)
    try {
      const { notifyNewOrder } = await import('@/src/services/telegram-service');
      if (updated) notifyNewOrder(updated).catch((e) => console.error('notifyNewOrder failed', e));
    } catch (err) {
      console.error('Failed to dispatch telegram notifyNewOrder', err);
    }

    return NextResponse.json({ success: true, data: { order: updated } });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || 'Failed to verify payment' }, { status: 400 });
  }
}
