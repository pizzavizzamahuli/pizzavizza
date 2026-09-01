import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { getTelegramAdminsCollection } from '@/src/models/telegram-admin';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const col = await getTelegramAdminsCollection();
  const docs = await col.find({}).sort({ createdAt: -1 }).toArray();

  const data = docs.map((d) => ({
    id: d._id?.toHexString(),
    userId: d.userId,
    telegramUserId: d.telegramUserId,
    telegramChatId: d.telegramChatId,
    status: d.status,
    linkedAt: d.linkedAt,
    lastUsedAt: d.lastUsedAt,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  }));

  return NextResponse.json({ success: true, data });
}
