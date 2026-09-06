import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { removePushSubscription, upsertPushSubscription } from '@/src/models/push-subscription';
import { env } from '@/src/config/env';

function userId(user: { _id?: { toHexString(): string }; id?: string }) {
  return user._id?.toHexString() || user.id || '';
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  return NextResponse.json({ configured: Boolean(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT), publicKey: env.VAPID_PUBLIC_KEY || null });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown }; userAgent?: unknown };
  if (typeof body.endpoint !== 'string' || typeof body.keys?.p256dh !== 'string' || typeof body.keys.auth !== 'string') {
    return NextResponse.json({ error: 'Invalid push subscription.' }, { status: 400 });
  }
  await upsertPushSubscription({ userId: userId(user), endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth, userAgent: typeof body.userAgent === 'string' ? body.userAgent.slice(0, 500) : null, lastUsedAt: null });
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const body = await request.json().catch(() => ({})) as { endpoint?: unknown };
  if (typeof body.endpoint !== 'string') return NextResponse.json({ error: 'Endpoint is required.' }, { status: 400 });
  await removePushSubscription(userId(user), body.endpoint);
  return NextResponse.json({ success: true });
}