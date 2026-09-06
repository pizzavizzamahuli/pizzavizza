import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { createLinkCode } from '@/src/models/telegram-link-code';
import { getUserById } from '@/src/services/user-service';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = await request.json();
    const targetUserId = typeof payload.userId === 'string' ? payload.userId : undefined;
    if (!targetUserId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    const targetUser = await getUserById(targetUserId);
    if (!targetUser || !['MAIN_ADMIN', 'ADMIN', 'MANAGER'].includes(targetUser.role)) {
      return NextResponse.json({ error: 'Only authorized administrative accounts can be linked to Telegram.' }, { status: 400 });
    }

    const { raw, record } = await createLinkCode(targetUserId, 300); // 5 minutes

    // Return the raw code to show to the admin (do not store raw in plaintext elsewhere)
    return NextResponse.json({ success: true, data: { code: raw, expiresAt: record.expiresAt } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create link code';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
