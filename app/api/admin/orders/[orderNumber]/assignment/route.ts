import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findOrderByOrderNumber, updateOrderByOrderNumber } from '@/src/models/order';
import { ObjectId } from 'mongodb';

export async function PUT(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'delivery.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { orderNumber } = await context.params;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  const payload = await request.json() as { staffId?: string | null; staffName?: string | null };
  let staffId: string | null = null;
  let staffName: string | null = null;
  if (payload.staffId) {
    const { getUsersCollection } = await import('@/src/models/user');
    let staff = null;
    try {
      staff = await (await getUsersCollection()).findOne({ _id: new ObjectId(payload.staffId), role: 'DELIVERY_STAFF', accountStatus: 'ACTIVE' });
    } catch {
      staff = null;
    }
    if (!staff) return NextResponse.json({ error: 'Active delivery staff member not found' }, { status: 400 });
    staffId = staff._id?.toHexString() || staff.id || null;
    staffName = staff.name;
  }
  const updated = await updateOrderByOrderNumber(orderNumber, {
    deliveryStaffId: staffId,
    deliveryStaffName: staffName,
  });
  return NextResponse.json({ success: true, data: updated });
}
