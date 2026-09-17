import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { countUnreadNotifications, listNotifications, markAllNotificationsRead } from '@/src/models/notification';

function getUserId(user: { _id?: { toHexString(): string }; id?: string }) {
  return user._id?.toHexString() || user.id || '';
}

function getAudience(role?: string) {
  return ['MAIN_ADMIN', 'ADMIN', 'MANAGER'].includes(role || '') ? 'ADMIN' as const : 'USER' as const;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const recipientId = getUserId(user);
  const audience = getAudience(user.role);
  const [notifications, unreadCount] = await Promise.all([listNotifications(recipientId, 50, audience), countUnreadNotifications(recipientId, audience)]);
  return NextResponse.json({ success: true, data: notifications, unreadCount });
}

export async function PATCH(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { all?: boolean };
  if (!body.all) return NextResponse.json({ error: 'Use the notification id endpoint.' }, { status: 400 });
  await markAllNotificationsRead(getUserId(user), getAudience(user.role));
  return NextResponse.json({ success: true });
}
