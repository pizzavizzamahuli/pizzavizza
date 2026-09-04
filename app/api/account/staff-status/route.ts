import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { updateUser } from '@/src/services/user-service';

const statuses = ['AVAILABLE', 'BUSY', 'ON_DELIVERY', 'OFFLINE'] as const;

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user || !['DELIVERY_STAFF', 'KITCHEN_STAFF'].includes(user.role)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await request.json().catch(() => ({})) as { staffStatus?: string };
  const staffStatus = String(body.staffStatus || '').toUpperCase();
  if (!statuses.includes(staffStatus as (typeof statuses)[number])) return NextResponse.json({ error: 'Invalid staff status' }, { status: 400 });
  await updateUser(user._id!.toHexString(), { staffStatus: staffStatus as (typeof statuses)[number] });
  return NextResponse.json({ success: true, staffStatus });
}
