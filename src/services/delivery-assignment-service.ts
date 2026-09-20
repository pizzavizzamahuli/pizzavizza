import { getUsersCollection } from '@/src/models/user';
import { assignDeliveryStaff, findOrderByOrderNumber, listOrders } from '@/src/models/order';
import { getRestaurantSettings, updateRestaurantSettings } from '@/src/models/restaurant-settings';
import { isOrderPaymentCleared } from '@/src/services/payment-service';
import { notifyAdmins, notifyUser } from '@/src/services/notification-service';
import { createDeliveryAuditEvent } from '@/src/models/delivery-audit';
import { buildDeliveryStaffLookupFilter } from '@/src/utils/delivery-staff-ids';

export async function autoAssignDeliveryStaff(orderNumber: string) {
  const [order, settings] = await Promise.all([findOrderByOrderNumber(orderNumber), getRestaurantSettings()]);
  if (!order || order.fulfillmentType !== 'DELIVERY' || order.orderStatus !== 'READY' || order.deliveryStaffId || !isOrderPaymentCleared(order.paymentMethod, order.paymentStatus)) return null;
  if (!['AUTOMATIC', 'MANUAL_FALLBACK'].includes(settings.deliveryAssignmentMode)) return null;

  const eligibleIds = Array.isArray(settings.deliveryAssignmentEligibleStaffIds)
    ? settings.deliveryAssignmentEligibleStaffIds.map((id) => String(id).trim()).filter(Boolean)
    : [];

  if (!eligibleIds.length) {
    await (await import('@/src/models/order')).updateOrderByOrderNumber(orderNumber, { deliveryAssignmentStatus: 'PENDING' });
    await notifyAdmins({ type: 'DELIVERY_ASSIGNMENT_PENDING', title: 'Delivery assignment pending', message: `Select eligible delivery staff for ${orderNumber} in Delivery Settings.`, href: `/admin/orders/${orderNumber}`, relatedType: 'order', relatedId: orderNumber, permission: 'delivery.view', eventKey: `delivery-pending-no-staff:${orderNumber}` }).catch(() => undefined);
    return null;
  }

  const users = await (await getUsersCollection()).find({
    ...(eligibleIds.length ? buildDeliveryStaffLookupFilter(eligibleIds) : { role: 'DELIVERY_STAFF', accountStatus: 'ACTIVE' }),
    $or: [
      { staffStatus: { $in: ['AVAILABLE', 'BUSY'] } },
      { staffStatus: { $exists: false } },
    ],
  }).toArray();

  if (!users.length) {
    await (await import('@/src/models/order')).updateOrderByOrderNumber(orderNumber, { deliveryAssignmentStatus: 'PENDING' });
    await notifyAdmins({ type: 'DELIVERY_ASSIGNMENT_PENDING', title: 'Delivery assignment pending', message: `No eligible delivery staff is available for ${orderNumber}.`, href: `/admin/orders/${orderNumber}`, relatedType: 'order', relatedId: orderNumber, permission: 'delivery.view', eventKey: `delivery-pending:${orderNumber}` }).catch(() => undefined);
    return null;
  }

  const staffIdOf = (user: (typeof users)[number]) => user._id?.toHexString() || user.id || user.userCode || '';
  const activeStaffIds = users.map(staffIdOf).filter(Boolean);
  const activeOrders = await listOrders({ fulfillmentType: 'DELIVERY', deliveryStaffId: { $in: activeStaffIds }, orderStatus: { $in: ['READY', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } } as never);
  const assignmentHistory = await listOrders({ fulfillmentType: 'DELIVERY', deliveryStaffId: { $in: activeStaffIds } } as never);
  const workload = new Map<string, number>();
  for (const user of users) workload.set(staffIdOf(user), 0);
  for (const active of activeOrders) if (active.deliveryStaffId) workload.set(active.deliveryStaffId, (workload.get(active.deliveryStaffId) || 0) + 1);

  const strategy = settings.deliveryAssignmentStrategy || 'LOWEST_WORKLOAD';
  let selected = [...users].sort((left, right) => (workload.get(staffIdOf(left)) || 0) - (workload.get(staffIdOf(right)) || 0))[0];
  if (strategy === 'ROUND_ROBIN' || strategy === 'LEAST_RECENT') {
    const lastIndex = settings.deliveryAssignmentLastStaffId ? users.findIndex((user) => staffIdOf(user) === settings.deliveryAssignmentLastStaffId) : -1;
    if (strategy === 'ROUND_ROBIN') selected = users[(lastIndex + 1) % users.length] || selected;
    if (strategy === 'LEAST_RECENT') {
      const latestAssignment = new Map<string, number>();
      for (const assignedOrder of assignmentHistory) {
        if (!assignedOrder.deliveryStaffId) continue;
        const timestamp = assignedOrder.deliveryAssignedAt?.getTime() || assignedOrder.updatedAt?.getTime() || 0;
        latestAssignment.set(assignedOrder.deliveryStaffId, Math.max(latestAssignment.get(assignedOrder.deliveryStaffId) || 0, timestamp));
      }
      selected = [...users].sort((left, right) => (latestAssignment.get(staffIdOf(left)) || 0) - (latestAssignment.get(staffIdOf(right)) || 0))[0] || selected;
    }
  }

  if (!selected) return null;

  const staffId = staffIdOf(selected);
  const updated = await assignDeliveryStaff(orderNumber, staffId, selected.name, 'SYSTEM_AUTO_ASSIGNMENT', null);
  if (!updated) return null;
  await updateRestaurantSettings({ deliveryAssignmentLastStaffId: staffId });
  await createDeliveryAuditEvent({ orderId: updated._id?.toHexString() || updated.id || orderNumber, event: 'DELIVERY_ASSIGNED', performedBy: 'SYSTEM', metadata: { orderNumber, staffId, staffName: selected.name, automatic: true } });
  notifyUser(staffId, { type: 'DELIVERY_ASSIGNED', title: 'New delivery automatically assigned', message: `Order ${orderNumber} is assigned to you.`, href: '/delivery', relatedType: 'order', relatedId: orderNumber, eventKey: `auto-delivery:${orderNumber}:${staffId}` }).catch(() => undefined);
  notifyAdmins({ type: 'DELIVERY_ASSIGNED', title: 'Delivery automatically assigned', message: `${orderNumber} was assigned to ${selected.name}.`, href: `/admin/orders/${orderNumber}`, relatedType: 'order', relatedId: orderNumber, permission: 'delivery.view', eventKey: `admin-auto-delivery:${orderNumber}` }).catch(() => undefined);
  return updated;
}