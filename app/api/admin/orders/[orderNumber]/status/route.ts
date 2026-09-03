import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findOrderByOrderNumber, updateOrderStatusByOrderNumber, canTransitionOrderStatus, validOrderStatusTransitions, OrderStatus } from '@/src/models/order';
import { notifyAdmins, notifyUser } from '@/src/services/notification-service';
import { qualifyReferralReward } from '@/src/services/promo-service';

export async function PUT(request: Request, context: unknown) {
  const { params } = context as { params: { orderNumber: string } };
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'orders.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const order = await findOrderByOrderNumber(params.orderNumber);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  try {
    const payload = await request.json();
    const { status } = payload;
    if (!status) return NextResponse.json({ error: 'status is required' }, { status: 400 });
    if (typeof status !== 'string') return NextResponse.json({ error: 'status must be a string' }, { status: 400 });

    const normalizedStatus = status.trim().toUpperCase();
    const validStatuses = Object.keys(validOrderStatusTransitions) as Array<string>;
    if (!validStatuses.includes(normalizedStatus)) {
      return NextResponse.json({ error: 'Invalid order status' }, { status: 400 });
    }

    if (!canTransitionOrderStatus(order.orderStatus, normalizedStatus as OrderStatus)) {
      return NextResponse.json({ error: `Cannot transition order from ${order.orderStatus} to ${normalizedStatus}` }, { status: 400 });
    }

    const updated = await updateOrderStatusByOrderNumber(order.orderNumber, normalizedStatus as OrderStatus, user._id!.toHexString(), `Admin updated order status to ${normalizedStatus}`);
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
    }
    notifyUser(updated.userId, { type: `ORDER_${normalizedStatus}`, title: `Order ${normalizedStatus.toLowerCase()}`, message: `Order ${updated.orderNumber} is now ${normalizedStatus.toLowerCase()}.`, href: `/account/orders/${updated.orderNumber}`, relatedType: 'order', relatedId: updated.orderNumber, eventKey: `order:${updated.orderNumber}:status:${normalizedStatus}` }).catch((error) => console.error('Order notification failed', error));
    if (normalizedStatus === 'CANCELLED' || normalizedStatus === 'REJECTED') notifyAdmins({ type: `ORDER_${normalizedStatus}`, title: `Order ${normalizedStatus.toLowerCase()}`, message: `Order ${updated.orderNumber} was ${normalizedStatus.toLowerCase()}.`, href: `/admin/orders/${updated.orderNumber}`, relatedType: 'order', relatedId: updated.orderNumber, permission: 'orders.view', eventKey: `admin:order:${updated.orderNumber}:status:${normalizedStatus}` }).catch((error) => console.error('Admin order notification failed', error));
    qualifyReferralReward(updated).catch((error) => console.error('Referral qualification failed', error));

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update order status';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
