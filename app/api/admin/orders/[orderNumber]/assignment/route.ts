import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { assignDeliveryStaff, findOrderByOrderNumber } from '@/src/models/order';
import { ObjectId } from 'mongodb';
import { notifyUser, notifyAdmins } from '@/src/services/notification-service';
import { isOrderPaymentCleared } from '@/src/services/payment-service';
import { createDeliveryAuditEvent } from '@/src/models/delivery-audit';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

export async function PUT(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'delivery.manage', user.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { orderNumber } = await context.params;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (order.fulfillmentType !== 'DELIVERY' || order.orderStatus !== 'READY' || ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'].includes(order.orderStatus)) return NextResponse.json({ error: 'Only READY delivery orders can be assigned.' }, { status: 400 });
  if (!isOrderPaymentCleared(order.paymentMethod, order.paymentStatus)) return NextResponse.json({ error: 'Payment must be verified before delivery assignment.' }, { status: 409 });
  const payload = await request.json() as { staffId?: string | null; staffName?: string | null };
  let staffId: string | null = null;
  let staffName: string | null = null;
  if (payload.staffId) {
    const { getUsersCollection } = await import('@/src/models/user');
    let staff = null;
    try {
      const staffCollection = await getUsersCollection();
      const identityFilters: Array<Record<string, unknown>> = [{ id: payload.staffId }];
      if (ObjectId.isValid(payload.staffId)) identityFilters.push({ _id: new ObjectId(payload.staffId) });
      staff = await staffCollection.findOne({ $and: [{ $or: identityFilters }, { $or: [{ staffStatus: { $in: ['AVAILABLE', 'BUSY'] } }, { staffStatus: { $exists: false } }] }], role: 'DELIVERY_STAFF', accountStatus: 'ACTIVE' } as never);
    } catch {
      staff = null;
    }
    if (!staff) return NextResponse.json({ error: 'Active delivery staff member not found' }, { status: 400 });
    const settings = await getRestaurantSettings();
    if (settings.deliveryAssignmentEligibleStaffIds.length && !settings.deliveryAssignmentEligibleStaffIds.includes(payload.staffId)) {
      return NextResponse.json({ error: 'This delivery staff member is not eligible for assignment.' }, { status: 409 });
    }
    staffId = staff._id?.toHexString() || staff.id || null;
    staffName = staff.name;
  }
  const updated = await assignDeliveryStaff(orderNumber, staffId, staffName, user._id!.toHexString(), order.deliveryStaffId || null);
  if (!updated) return NextResponse.json({ error: 'Assignment changed concurrently. Refresh and try again.' }, { status: 409 });
  if (staffId) notifyUser(staffId, { type: 'DELIVERY_ASSIGNED', title: 'Delivery assigned', message: `Order ${orderNumber} is assigned to you.`, href: `/delivery`, relatedType: 'order', relatedId: orderNumber, eventKey: `order:${orderNumber}:delivery:${staffId}` }).catch((error) => console.error('Delivery notification failed', error));
  if (order.deliveryStaffId && order.deliveryStaffId !== staffId) notifyUser(order.deliveryStaffId, { type: 'DELIVERY_REASSIGNED', title: 'Delivery assignment changed', message: `Order ${orderNumber} has been reassigned.`, href: '/delivery', relatedType: 'order', relatedId: orderNumber, eventKey: `order:${orderNumber}:delivery:reassigned:${order.deliveryStaffId}` }).catch(() => undefined);
  await createDeliveryAuditEvent({ orderId: updated._id?.toHexString() || updated.id || orderNumber, event: staffId ? 'DELIVERY_ASSIGNED' : 'DELIVERY_UNASSIGNED', performedBy: user._id?.toHexString() || user.id || null, metadata: { orderNumber, previousDeliveryStaffId: order.deliveryStaffId || null, newDeliveryStaffId: staffId, newDeliveryStaffName: staffName, actorRole: user.role } });
  notifyAdmins({ type: 'DELIVERY_ASSIGNED', title: 'Delivery assignment updated', message: `${orderNumber} is assigned to ${staffName || 'no staff'}.`, href: `/admin/orders/${orderNumber}`, relatedType: 'order', relatedId: orderNumber, permission: 'delivery.view', eventKey: `admin:order:${orderNumber}:delivery:${staffId || 'unassigned'}` }).catch((error) => console.error('Admin delivery notification failed', error));
  return NextResponse.json({ success: true, data: updated });
}
