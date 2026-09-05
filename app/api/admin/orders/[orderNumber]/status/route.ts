import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findOrderByOrderNumber, updateOrderStatusByOrderNumber, canTransitionOrderStatus, validOrderStatusTransitions, OrderStatus } from '@/src/models/order';
import { notifyAdmins, notifyUser } from '@/src/services/notification-service';
import { qualifyReferralReward } from '@/src/services/promo-service';
import { isOrderPaymentCleared } from '@/src/services/payment-service';

export async function PUT(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await context.params;
  const user = await getSessionUser();
  const canManageOrders = user && AuthorizationService.canAccess(user.role, 'orders.manage', user.permissions);
  const canManageKitchen = user && AuthorizationService.canAccess(user.role, 'kitchen.manage', user.permissions);
  const canManageDelivery = user && AuthorizationService.canAccess(user.role, 'delivery.manage', user.permissions);
  if (!user || (!canManageOrders && !canManageKitchen && !canManageDelivery)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }

  try {
    const payload = await request.json();
    const { status } = payload;
    const deliveryFailureReason = typeof payload.deliveryFailureReason === 'string' ? payload.deliveryFailureReason.trim().slice(0, 500) : null;
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
    if (order.fulfillmentType === 'DELIVERY' && order.orderStatus === 'READY' && normalizedStatus === 'DELIVERED') {
      return NextResponse.json({ error: 'Delivery orders must be picked up and sent out before delivery completion.' }, { status: 409 });
    }

    if (canManageKitchen && !canManageOrders && !['CONFIRMED', 'PREPARING', 'READY'].includes(normalizedStatus)) {
      return NextResponse.json({ error: 'Kitchen staff can only update preparation status.' }, { status: 403 });
    }
    if (canManageDelivery && !canManageOrders && (order.deliveryStaffId !== user._id?.toHexString() && order.deliveryStaffId !== user.id)) return NextResponse.json({ error: 'Delivery staff can only update assigned orders.' }, { status: 403 });
    if (canManageDelivery && !canManageOrders && !['PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(normalizedStatus)) return NextResponse.json({ error: 'Delivery staff can only update delivery status.' }, { status: 403 });
    if (normalizedStatus === 'CANCELLED' && canManageDelivery && !canManageOrders && !deliveryFailureReason) return NextResponse.json({ error: 'A delivery failure reason is required.' }, { status: 400 });
    if (['CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(normalizedStatus) && !isOrderPaymentCleared(order.paymentMethod, order.paymentStatus)) {
      return NextResponse.json({ error: 'Payment must be verified before this order can be processed.' }, { status: 409 });
    }

    const updated = await updateOrderStatusByOrderNumber(order.orderNumber, normalizedStatus as OrderStatus, user._id!.toHexString(), deliveryFailureReason || `Admin updated order status to ${normalizedStatus}`);
    if (updated && deliveryFailureReason) await (await import('@/src/models/order')).updateOrderByOrderNumber(updated.orderNumber, { deliveryFailureReason });
    if (!updated) {
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
    }
    if (normalizedStatus === 'READY' && updated.fulfillmentType === 'DELIVERY') {
      const { autoAssignDeliveryStaff } = await import('@/src/services/delivery-assignment-service');
      autoAssignDeliveryStaff(updated.orderNumber).catch((error) => console.error('Automatic delivery assignment failed', error));
    }
    notifyUser(updated.userId, { type: `ORDER_${normalizedStatus}`, title: `Order ${normalizedStatus.toLowerCase()}`, message: `Order ${updated.orderNumber} is now ${normalizedStatus.toLowerCase()}.`, href: `/account/orders/${updated.orderNumber}`, relatedType: 'order', relatedId: updated.orderNumber, eventKey: `order:${updated.orderNumber}:status:${normalizedStatus}` }).catch((error) => console.error('Order notification failed', error));
    if (updated.deliveryStaffId && ['READY', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(normalizedStatus)) notifyUser(updated.deliveryStaffId, { type: `DELIVERY_ORDER_${normalizedStatus}`, title: `Delivery order ${normalizedStatus.toLowerCase()}`, message: `Order ${updated.orderNumber} is ${normalizedStatus.toLowerCase()}.`, href: '/delivery', relatedType: 'order', relatedId: updated.orderNumber, eventKey: `delivery:${updated.orderNumber}:status:${normalizedStatus}` }).catch((error) => console.error('Delivery notification failed', error));
    if (normalizedStatus === 'CANCELLED' || normalizedStatus === 'REJECTED') notifyAdmins({ type: `ORDER_${normalizedStatus}`, title: `Order ${normalizedStatus.toLowerCase()}`, message: `Order ${updated.orderNumber} was ${normalizedStatus.toLowerCase()}.`, href: `/admin/orders/${updated.orderNumber}`, relatedType: 'order', relatedId: updated.orderNumber, permission: 'orders.view', eventKey: `admin:order:${updated.orderNumber}:status:${normalizedStatus}` }).catch((error) => console.error('Admin order notification failed', error));
    qualifyReferralReward(updated).catch((error) => console.error('Referral qualification failed', error));

    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update order status';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
