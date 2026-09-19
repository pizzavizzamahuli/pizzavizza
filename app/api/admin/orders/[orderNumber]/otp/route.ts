import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findOrderByOrderNumber, issueOrderDeliveryOtp, verifyOrderDeliveryOtp } from '@/src/models/order';

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
  const canManageOrders = AuthorizationService.canAccess(user.role, 'orders.manage', user.permissions);
  const isAssignedDeliveryStaff = user.role === 'DELIVERY_STAFF' && order.deliveryStaffId && [currentStaffId, user.id].includes(order.deliveryStaffId);
  if (!canManageOrders && !isAssignedDeliveryStaff) {
    return NextResponse.json({ error: 'This order is not assigned to your delivery account.' }, { status: 403 });
  }

  const payload = await request.json();
  const action = payload?.action === 'resend' ? 'resend' : 'verify';

  if (action === 'resend') {
    const result = await issueOrderDeliveryOtp(order.orderNumber);
    if (!result) {
      return NextResponse.json({ error: 'Unable to generate a fresh OTP for this order.' }, { status: 400 });
    }
    return NextResponse.json({ success: true, message: 'A fresh delivery OTP has been generated.' });
  }

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
