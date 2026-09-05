import { getUsersCollection } from '@/src/models/user';
import { assignDeliveryStaff, findOrderByOrderNumber, listOrders } from '@/src/models/order';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { isOrderPaymentCleared } from '@/src/services/payment-service';
import { notifyAdmins, notifyUser } from '@/src/services/notification-service';
import { createDeliveryAuditEvent } from '@/src/models/delivery-audit';
import { ObjectId } from 'mongodb';

export async function autoAssignDeliveryStaff(orderNumber: string) {
  const [order, settings] = await Promise.all([findOrderByOrderNumber(orderNumber), getRestaurantSettings()]);
  if (!order || order.fulfillmentType !== 'DELIVERY' || order.orderStatus !== 'READY' || order.deliveryStaffId || !isOrderPaymentCleared(order.paymentMethod, order.paymentStatus)) return null;
  if (!['AUTOMATIC', 'MANUAL_FALLBACK'].includes(settings.deliveryAssignmentMode)) return null;
  const eligibleIds = settings.deliveryAssignmentEligibleStaffIds || [];
  if (!eligibleIds.length) return null;
  const users = await (await getUsersCollection()).find({ role: 'DELIVERY_STAFF', accountStatus: 'ACTIVE', _id: { $in: eligibleIds.flatMap((id) => { try { return [new ObjectId(id)]; } catch { return []; } }) }, staffStatus: { $in: ['AVAILABLE', 'BUSY'] } }).toArray();
  if (!users.length) {
    await notifyAdmins({ type: 'DELIVERY_ASSIGNMENT_PENDING', title: 'Delivery assignment pending', message: `No eligible delivery staff is available for ${orderNumber}.`, href: `/admin/orders/${orderNumber}`, relatedType: 'order', relatedId: orderNumber, permission: 'delivery.view', eventKey: `delivery-pending:${orderNumber}` }).catch(() => undefined);
    return null;
  }
  const activeOrders = await listOrders({ fulfillmentType: 'DELIVERY', deliveryStaffId: { $in: users.map((user) => user._id?.toHexString() || user.id || '') }, orderStatus: { $in: ['READY', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } } as never);
  const workload = new Map<string, number>();
  for (const user of users) workload.set(user._id?.toHexString() || user.id || '', 0);
  for (const active of activeOrders) if (active.deliveryStaffId) workload.set(active.deliveryStaffId, (workload.get(active.deliveryStaffId) || 0) + 1);
  const selected = [...users].sort((left, right) => (workload.get(left._id?.toHexString() || left.id || '') || 0) - (workload.get(right._id?.toHexString() || right.id || '') || 0))[0];
  const staffId = selected._id?.toHexString() || selected.id || '';
  const updated = await assignDeliveryStaff(orderNumber, staffId, selected.name, 'SYSTEM_AUTO_ASSIGNMENT', null);
  if (!updated) return null;
  await createDeliveryAuditEvent({ orderId: updated._id?.toHexString() || updated.id || orderNumber, event: 'DELIVERY_ASSIGNED', performedBy: 'SYSTEM', metadata: { orderNumber, staffId, staffName: selected.name, automatic: true } });
  notifyUser(staffId, { type: 'DELIVERY_ASSIGNED', title: 'New delivery automatically assigned', message: `Order ${orderNumber} is assigned to you.`, href: '/delivery', relatedType: 'order', relatedId: orderNumber, eventKey: `auto-delivery:${orderNumber}:${staffId}` }).catch(() => undefined);
  notifyAdmins({ type: 'DELIVERY_ASSIGNED', title: 'Delivery automatically assigned', message: `${orderNumber} was assigned to ${selected.name}.`, href: `/admin/orders/${orderNumber}`, relatedType: 'order', relatedId: orderNumber, permission: 'delivery.view', eventKey: `admin-auto-delivery:${orderNumber}` }).catch(() => undefined);
  return updated;
}