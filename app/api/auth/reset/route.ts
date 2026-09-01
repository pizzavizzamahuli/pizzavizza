import { NextResponse } from 'next/server';
import { comparePassword, findUserByEmail, updateUserPassword, clearPasswordReset, normalizeEmail } from '@/src/services/user-service';
import { env } from '@/src/config/env';

export async function POST(request: Request) {
  try {
    if (!env.MONGODB_URI) {
      return NextResponse.json({ error: 'MongoDB connection requires MONGODB_URI in .env.local.' }, { status: 503 });
    }

    const body = await request.json();
    const email = normalizeEmail(String(body?.email || ''));
    const code = String(body?.code || '').trim();
    const password = String(body?.password || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if (!email || !code || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user || !user.passwordReset) {
      return NextResponse.json({ error: 'Invalid reset code or expired link.' }, { status: 401 });
    }

    if (user.passwordReset.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Reset code has expired.' }, { status: 401 });
    }

    const isValidCode = await comparePassword(code, user.passwordReset.codeHash);
    if (!isValidCode) {
      return NextResponse.json({ error: 'Invalid reset code or expired link.' }, { status: 401 });
    }

    await updateUserPassword(user._id?.toHexString() || user.id || '', password);
    await clearPasswordReset(user._id?.toHexString() || user.id || '');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password failed', error);
    return NextResponse.json({ error: 'Unable to reset password.' }, { status: 500 });
  }
}
