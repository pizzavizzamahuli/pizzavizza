import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { findOrderByOrderNumber, verifyOrderDeliveryOtp } from '@/src/models/order';

export async function PUT(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const { orderNumber } = await context.params;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.fulfillmentType !== 'DELIVERY') {
    return NextResponse.json({ error: 'OTP verification is only available for delivery orders.' }, { status: 400 });
  }

  const currentStaffId = user._id?.toHexString() || user.id || '';
  const canVerify = user.role === 'DELIVERY_STAFF' && order.deliveryStaffId && [currentStaffId, user.id].includes(order.deliveryStaffId);
  if (!canVerify) {
    return NextResponse.json({ error: 'This order is not assigned to your delivery account.' }, { status: 403 });
  }

  const payload = await request.json();
  const code = typeof payload?.code === 'string' ? payload.code.trim() : '';
  if (!code) {
    return NextResponse.json({ error: 'OTP code is required.' }, { status: 400 });
  }

  const result = await verifyOrderDeliveryOtp(order.orderNumber, code, currentStaffId || 'delivery-staff');
  if (!result.ok) {
    return NextResponse.json({ error: result.reason || 'Invalid OTP.' }, { status: 400 });
  }

  return NextResponse.json({ success: true, message: 'Delivery OTP verified successfully.', data: result.order });
}
