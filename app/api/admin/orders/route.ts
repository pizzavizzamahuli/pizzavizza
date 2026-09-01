import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { listOrders, OrderDocument, PaymentStatus } from '@/src/models/order';
import { AuthorizationService } from '@/src/config/permissions';

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!AuthorizationService.canAccess(user.role, 'orders.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(request.url);
  const paymentStatus = url.searchParams.get('paymentStatus');
  const filter: Partial<OrderDocument> = paymentStatus ? { paymentStatus: paymentStatus as PaymentStatus } : {};
  const orders = await listOrders(filter);
  return NextResponse.json({ success: true, data: orders });
}
