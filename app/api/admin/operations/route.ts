import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { listOrders } from '@/src/models/order';
import { listBookings } from '@/src/services/dining-service';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { isOrderPaymentCleared } from '@/src/services/payment-service';

export async function GET() {
  const user = await getSessionUser();
  const canViewOrders = user && AuthorizationService.canAccess(user.role, 'orders.view', user.permissions);
  const canViewDelivery = user && AuthorizationService.canAccess(user.role, 'delivery.view', user.permissions);
  const canViewKitchen = user && AuthorizationService.canAccess(user.role, 'kitchen.view', user.permissions);
  if (!user || (!canViewOrders && !canViewDelivery && !canViewKitchen)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const [orders, bookings, settings] = await Promise.all([listOrders(), listBookings(), getRestaurantSettings()]);
  const eligibleOrders = orders.filter((order) => isOrderPaymentCleared(order.paymentMethod, order.paymentStatus));
  const scopedOrders = user.role === 'DELIVERY_STAFF' ? eligibleOrders.filter((order) => order.deliveryStaffId === user._id?.toHexString() || order.deliveryStaffId === user.id) : user.role === 'KITCHEN_STAFF' ? eligibleOrders.filter((order) => ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'].includes(order.orderStatus)) : orders;
  let staff: Array<{ id?: string; name: string; mobile?: string | null; accountStatus: string }> = [];
  if (AuthorizationService.canAccess(user.role, 'delivery.manage', user.permissions)) {
    const { getUsersCollection } = await import('@/src/models/user');
    const users = await (await getUsersCollection()).find({ role: 'DELIVERY_STAFF', accountStatus: 'ACTIVE' }).project({ passwordHash: 0, passwordReset: 0 }).toArray();
    staff = users.map((item) => ({ id: item._id?.toHexString() || item.id, name: item.name, mobile: item.mobile || null, accountStatus: item.accountStatus }));
  }
  return NextResponse.json({
    success: true,
    data: {
      orders: scopedOrders.map((order) => ({ ...order, _id: order._id?.toHexString(), createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() })),
      bookings: user.role === 'DELIVERY_STAFF' ? [] : bookings.map((booking) => ({ ...booking, _id: booking._id?.toHexString(), createdAt: booking.createdAt.toISOString(), updatedAt: booking.updatedAt.toISOString() })),
      staff,
      storeLocation: typeof settings.latitude === 'number' && typeof settings.longitude === 'number' ? { latitude: settings.latitude, longitude: settings.longitude } : null,
      restaurantName: settings.restaurantName,
    },
  });
}
