import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { revokeTelegramAdmin } from '@/src/models/telegram-admin';

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== 'MAIN_ADMIN') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await context.params;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  try {
    await revokeTelegramAdmin(id);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed to revoke' }, { status: 500 });
  }
}
