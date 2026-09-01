import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { findOrderByOrderNumber } from '@/src/models/order';
import { AuthorizationService } from '@/src/config/permissions';

export async function GET(request: Request, context: unknown) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!AuthorizationService.canAccess(user.role, 'orders.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const orderNumber = (context as { params: { orderNumber: string } })?.params?.orderNumber;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true, data: order });
}
