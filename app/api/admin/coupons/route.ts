import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { createCoupon, listCoupons, updateCoupon } from '@/src/models/coupon';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!AuthorizationService.canAccess(user.role, 'coupons.view', user.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const coupons = await listCoupons();
  return NextResponse.json({ success: true, data: coupons });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!AuthorizationService.canAccess(user.role, 'coupons.manage', user.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const payload = await request.json();
  const coupon = await createCoupon(payload);
  return NextResponse.json({ success: true, data: coupon });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!AuthorizationService.canAccess(user.role, 'coupons.manage', user.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const payload = await request.json();
  const { id, ...updates } = payload;
  if (!id) return NextResponse.json({ error: 'Coupon id required' }, { status: 400 });
  const coupon = await updateCoupon(id, updates);
  return NextResponse.json({ success: true, data: coupon });
}
