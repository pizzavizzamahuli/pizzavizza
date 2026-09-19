import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { findOrderByOrderNumber } from '@/src/models/order';

export async function GET(request: Request, context: unknown) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const orderNumber = (context as { params: { orderNumber: string } })?.params?.orderNumber;
  const order = await findOrderByOrderNumber(orderNumber);
  const userId = user._id?.toHexString() || user.id || '';
  const canAccessAssignedDelivery = user.role === 'DELIVERY_STAFF' && order?.fulfillmentType === 'DELIVERY' && !!order.deliveryStaffId && [userId, user.id].includes(order.deliveryStaffId);
  if (!order || (order.userId !== userId && !canAccessAssignedDelivery)) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const payload = { ...order };
  const canSeeOtp = order.userId === userId || user.role !== 'DELIVERY_STAFF';
  if (!canSeeOtp) {
    delete payload.deliveryOtpCode;
    delete payload.deliveryOtpHash;
    delete payload.deliveryOtpExpiresAt;
    delete payload.deliveryOtpVerified;
    delete payload.deliveryOtpVerifiedAt;
    delete payload.deliveryOtpVerifiedBy;
    delete payload.deliveryOtpAttempts;
    delete payload.deliveryOtpLastAttemptAt;
  }

  return NextResponse.json({ success: true, data: payload });
}
