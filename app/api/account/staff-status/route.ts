import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { updateUser } from '@/src/services/user-service';
import { listOrders } from '@/src/models/order';

const statuses = ['AVAILABLE', 'BUSY', 'ON_DELIVERY', 'OFFLINE'] as const;

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user || !['DELIVERY_STAFF', 'KITCHEN_STAFF'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { staffStatus?: string };
  const staffStatus = String(body.staffStatus || '').toUpperCase();
  if (!statuses.includes(staffStatus as (typeof statuses)[number])) return NextResponse.json({ error: 'Invalid staff status' }, { status: 400 });
  if (user.role === 'DELIVERY_STAFF' && ['AVAILABLE', 'OFFLINE'].includes(staffStatus)) {
    const activeOrders = await listOrders({ deliveryStaffId: user._id!.toHexString(), orderStatus: { $in: ['READY', 'PICKED_UP', 'OUT_FOR_DELIVERY'] } } as never);
    if (activeOrders.length) return NextResponse.json({ error: 'Complete or release active deliveries before changing availability.' }, { status: 409 });
  }
  await updateUser(user._id!.toHexString(), { staffStatus: staffStatus as (typeof statuses)[number] });
  if (user.role === 'DELIVERY_STAFF' && staffStatus === 'AVAILABLE') {
    const pendingOrders = await listOrders({ fulfillmentType: 'DELIVERY', orderStatus: 'READY', deliveryAssignmentStatus: 'PENDING' } as never);
    const { autoAssignDeliveryStaff } = await import('@/src/services/delivery-assignment-service');
    await Promise.all(pendingOrders.slice(0, 10).map((order) => autoAssignDeliveryStaff(order.orderNumber).catch(() => null)));
  }
  return NextResponse.json({ success: true, staffStatus });
}
