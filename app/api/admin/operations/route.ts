import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { listOrders } from '@/src/models/order';
import { listBookings } from '@/src/services/dining-service';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'orders.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const [orders, bookings, settings] = await Promise.all([listOrders(), listBookings(), getRestaurantSettings()]);
  let staff: Array<{ id?: string; name: string; mobile?: string | null; accountStatus: string }> = [];
  if (AuthorizationService.canAccess(user.role, 'delivery.manage')) {
    const { getUsersCollection } = await import('@/src/models/user');
    const users = await (await getUsersCollection()).find({ role: 'DELIVERY_STAFF', accountStatus: 'ACTIVE' }).project({ passwordHash: 0, passwordReset: 0 }).toArray();
    staff = users.map((item) => ({ id: item._id?.toHexString() || item.id, name: item.name, mobile: item.mobile || null, accountStatus: item.accountStatus }));
  }
  return NextResponse.json({
    success: true,
    data: {
      orders: orders.map((order) => ({ ...order, _id: order._id?.toHexString(), createdAt: order.createdAt.toISOString(), updatedAt: order.updatedAt.toISOString() })),
      bookings: bookings.map((booking) => ({ ...booking, _id: booking._id?.toHexString(), createdAt: booking.createdAt.toISOString(), updatedAt: booking.updatedAt.toISOString() })),
      staff,
      storeLocation: typeof settings.latitude === 'number' && typeof settings.longitude === 'number' ? { latitude: settings.latitude, longitude: settings.longitude } : null,
      restaurantName: settings.restaurantName,
    },
  });
}
