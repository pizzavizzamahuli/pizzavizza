import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { markNotificationRead } from '@/src/models/notification';

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const { id } = await context.params;
  const recipientId = user._id?.toHexString() || user.id || '';
  const result = await markNotificationRead(id, recipientId);
  if (!result.matchedCount) return NextResponse.json({ error: 'Notification not found' }, { status: 404 });
  return NextResponse.json({ success: true });
}
