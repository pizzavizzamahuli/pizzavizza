import { getUsersCollection } from '@/src/models/user';
import { createNotification } from '@/src/models/notification';
import { AuthorizationService } from '@/src/config/permissions';
import type { PermissionName } from '@/src/config/permissions';

export type NotificationInput = {
  type: string;
  title: string;
  message: string;
  href?: string | null;
  relatedType?: string | null;
  relatedId?: string | null;
  permission?: PermissionName | null;
  eventKey: string;
};

export async function notifyUser(userId: string, input: NotificationInput) {
  return createNotification({ ...input, recipientId: userId, audience: 'USER' });
}

export async function notifyAdmins(input: NotificationInput) {
  const users = await getUsersCollection();
  const admins = await users.find({ role: { $in: ['MAIN_ADMIN', 'ADMIN', 'MANAGER', 'KITCHEN_STAFF'] }, accountStatus: 'ACTIVE' }).project({ _id: 1, role: 1 }).toArray();
  const recipients = admins.filter((admin) => admin.role === 'MAIN_ADMIN' || !input.permission || AuthorizationService.canAccess(admin.role, input.permission));
  await Promise.all(recipients.map((admin) => createNotification({ ...input, recipientId: admin._id!.toHexString(), audience: 'ADMIN' })));
  return recipients.length;
}

export async function notifyOrderPlaced(order: { orderNumber: string; userId: string; customerSnapshot: { name: string }; paymentStatus: string }) {
  await notifyUser(order.userId, { type: 'ORDER_PLACED', title: 'Order placed', message: `Your order ${order.orderNumber} has been placed.`, href: `/account/orders/${order.orderNumber}`, relatedType: 'order', relatedId: order.orderNumber, eventKey: `order:${order.orderNumber}:placed` });
  await notifyAdmins({ type: 'NEW_ORDER', title: 'New order', message: `${order.customerSnapshot.name} placed order ${order.orderNumber}.`, href: `/admin/orders/${order.orderNumber}`, relatedType: 'order', relatedId: order.orderNumber, permission: 'orders.view', eventKey: `order:${order.orderNumber}:admin-new` });
}
