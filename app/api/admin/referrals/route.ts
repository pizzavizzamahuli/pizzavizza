import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { createReferral, findReferralByUser, listReferrals } from '@/src/models/referral';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!AuthorizationService.canAccess(user.role, 'referrals.view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const referrals = await listReferrals();
  return NextResponse.json({ success: true, data: referrals });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  if (!AuthorizationService.canAccess(user.role, 'referrals.manage')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const payload = await request.json();
  const existing = await findReferralByUser(payload.userId);
  if (existing) return NextResponse.json({ error: 'Referral already exists for this user' }, { status: 400 });

  const referral = await createReferral(payload.userId, payload.rewardValue || 50);
  return NextResponse.json({ success: true, data: referral });
}
