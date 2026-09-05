import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { listOrdersForDeliveryStaff, listOrdersForUser } from '@/src/models/order';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const userId = user._id!.toHexString();
  const orders = user.role === 'DELIVERY_STAFF' ? await listOrdersForDeliveryStaff(userId) : await listOrdersForUser(userId);
  return NextResponse.json({ success: true, data: orders });
}
