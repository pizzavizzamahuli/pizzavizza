import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { listOrdersForUser } from '@/src/models/order';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const orders = await listOrdersForUser(user._id!.toHexString());
  return NextResponse.json({ success: true, data: orders });
}
