import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { verifyRazorpaySignature } from '@/src/services/razorpay-service';
import { updateOrderByOrderNumber } from '@/src/models/order';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const payload = await request.json();
    const { orderNumber, razorpayOrderId, razorpayPaymentId, razorpaySignature } = payload as Record<string, string>;
    if (!orderNumber || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const valid = await verifyRazorpaySignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!valid) {
      await updateOrderByOrderNumber(orderNumber, { paymentStatus: 'FAILED' });
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 400 });
    }

    // mark order as PAID
    const updated = await updateOrderByOrderNumber(orderNumber, { paymentStatus: 'PAID', paymentMethod: 'ONLINE' });

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
