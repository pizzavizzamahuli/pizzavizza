import { NextResponse } from 'next/server';
import { requireAuth } from '@/src/auth/guard';
import { comparePassword, updateUserPassword } from '@/src/services/user-service';
import { env } from '@/src/config/env';
import { recordAudit } from '@/src/models/audit-log';

export async function POST(request: Request) {
  try {
    if (!env.MONGODB_URI) {
      return NextResponse.json({ error: 'MongoDB connection requires MONGODB_URI in .env.local.' }, { status: 503 });
    }

    const user = await requireAuth();
    const body = await request.json();
    const currentPassword = String(body?.currentPassword || '');
    const newPassword = String(body?.newPassword || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ error: 'New password must be at least 8 characters.' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const isValidCurrent = await comparePassword(currentPassword, user.passwordHash);
    if (!isValidCurrent) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    await updateUserPassword(user._id?.toHexString() || user.id || '', newPassword);
    await recordAudit({ type: 'PASSWORD_CHANGED', performedBy: user._id?.toHexString() || user.id || null });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Change password failed', error);
    return NextResponse.json({ error: 'Unable to update password.' }, { status: 500 });
  }
}
