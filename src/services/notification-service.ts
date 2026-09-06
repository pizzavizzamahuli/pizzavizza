import { getUsersCollection } from '@/src/models/user';
import { createNotification, type NotificationDocument } from '@/src/models/notification';
import { AuthorizationService } from '@/src/config/permissions';
import type { PermissionName } from '@/src/config/permissions';
import { env } from '@/src/config/env';
import { listPushSubscriptions, removePushSubscriptionByEndpoint, touchPushSubscription } from '@/src/models/push-subscription';

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
  const notification = await createNotification({ ...input, recipientId: userId, audience: 'USER' });
  if (notification) await sendPushToUser(userId, notification);
  return notification;
}

async function sendPushToUser(userId: string, notification: Pick<NotificationDocument, 'title' | 'message' | 'href'>) {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY || !env.VAPID_SUBJECT) return;
  const subscriptions = await listPushSubscriptions(userId);
  if (!subscriptions.length) return;
  const webPush = await import('web-push');
  webPush.default.setVapidDetails(env.VAPID_SUBJECT, env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  await Promise.all(subscriptions.map(async (subscription) => {
    try {
      await webPush.default.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify({ title: notification.title, body: notification.message, data: { url: notification.href || '/account/notifications' } }));
      await touchPushSubscription(subscription.endpoint);
    } catch (error: unknown) {
      const statusCode = typeof error === 'object' && error && 'statusCode' in error ? Number(error.statusCode) : 0;
      if (statusCode === 404 || statusCode === 410) await removePushSubscriptionByEndpoint(subscription.endpoint);
      else console.error('Push notification failed:', error);
    }
  }));
}

export async function notifyAdmins(input: NotificationInput) {
  const users = await getUsersCollection();
  const admins = await users.find({ role: { $in: ['MAIN_ADMIN', 'ADMIN', 'MANAGER'] }, accountStatus: 'ACTIVE' }).project({ _id: 1, role: 1 }).toArray();
  const recipients = admins.filter((admin) => admin.role === 'MAIN_ADMIN' || !input.permission || AuthorizationService.canAccess(admin.role, input.permission));
  await Promise.all(recipients.map(async (admin) => {
    const notification = await createNotification({ ...input, recipientId: admin._id!.toHexString(), audience: 'ADMIN' });
    if (notification) await sendPushToUser(admin._id!.toHexString(), notification);
  }));
  return recipients.length;
}

export async function notifyRole(role: 'KITCHEN_STAFF' | 'DELIVERY_STAFF', input: NotificationInput) {
  const users = await getUsersCollection();
  const recipients = await users.find({ role, accountStatus: 'ACTIVE' }).project({ _id: 1 }).toArray();
  await Promise.all(recipients.map((recipient) => notifyUser(recipient._id!.toHexString(), input)));
  return recipients.length;
}

export async function notifyOrderPlaced(order: { orderNumber: string; userId: string; customerSnapshot: { name: string }; paymentStatus: string }) {
  await notifyUser(order.userId, { type: 'ORDER_PLACED', title: 'Order placed', message: `Your order ${order.orderNumber} has been placed.`, href: `/account/orders/${order.orderNumber}`, relatedType: 'order', relatedId: order.orderNumber, eventKey: `order:${order.orderNumber}:placed` });
  await notifyAdmins({ type: 'NEW_ORDER', title: 'New order', message: `${order.customerSnapshot.name} placed order ${order.orderNumber}.`, href: `/admin/orders/${order.orderNumber}`, relatedType: 'order', relatedId: order.orderNumber, permission: 'orders.view', eventKey: `order:${order.orderNumber}:admin-new` });
  await notifyRole('KITCHEN_STAFF', { type: 'KITCHEN_ORDER_READY', title: 'New order ready for preparation', message: `Order ${order.orderNumber} is ready for preparation.`, href: '/kitchen', relatedType: 'order', relatedId: order.orderNumber, eventKey: `order:${order.orderNumber}:kitchen-new` });
}
