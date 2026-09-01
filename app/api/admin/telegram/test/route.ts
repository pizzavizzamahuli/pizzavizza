import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { safeNotify } from '@/src/services/telegram-service';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = await request.json();
    const chatId = payload.chatId;
    if (!chatId) return NextResponse.json({ error: 'chatId required' }, { status: 400 });

    await safeNotify(chatId, `Test message from Pizza Vizza admin: ${user.name}`);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to send test message' }, { status: 500 });
  }
}
