import { NextResponse } from 'next/server';
import { comparePassword, findUserByEmail, updateUserPassword, clearPasswordReset, normalizeEmail, incrementPasswordResetAttempt, findUserByPhonePasswordResetToken, consumePhonePasswordResetToken } from '@/src/services/user-service';
import { env } from '@/src/config/env';

export async function POST(request: Request) {
  try {
    if (!env.MONGODB_URI) {
      return NextResponse.json({ error: 'MongoDB connection requires MONGODB_URI in .env.local.' }, { status: 503 });
    }

    const body = await request.json();
    const email = normalizeEmail(String(body?.email || ''));
    const code = String(body?.code || '').trim();
    const resetToken = String(body?.resetToken || '').trim();
    const method = body?.method === 'phone' ? 'phone' : 'email';
    const password = String(body?.password || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if ((method === 'email' && (!email || !code)) || (method === 'phone' && !resetToken) || !password || !confirmPassword) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    const user = method === 'email'
      ? await findUserByEmail(email)
      : await findUserByPhonePasswordResetToken(resetToken);
    if (!user || !user.passwordReset) {
      return NextResponse.json({ error: 'Invalid reset code or expired link.' }, { status: 401 });
    }

    if (user.passwordReset.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Reset code has expired.' }, { status: 401 });
    }

    const updated = await incrementPasswordResetAttempt(user._id?.toHexString() || user.id || '');
    const reset = updated?.passwordReset;
    const hash = method === 'phone' ? reset?.tokenHash : reset?.codeHash;
    if (!updated || !reset || !hash || reset.expiresAt < new Date() || (reset.attempts ?? 0) > 5 || !(await comparePassword(method === 'phone' ? resetToken : code, hash))) {
      return NextResponse.json({ error: 'Invalid reset code or expired link.' }, { status: 401 });
    }

    const userId = updated._id?.toHexString() || updated.id || '';
    if (method === 'phone') {
      const consumed = await consumePhonePasswordResetToken(userId, reset.tokenHash || '', password);
      if (!consumed.modifiedCount) {
        return NextResponse.json({ error: 'Invalid reset code or expired link.' }, { status: 401 });
      }
    } else {
      await updateUserPassword(userId, password);
      await clearPasswordReset(userId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password failed', error);
    return NextResponse.json({ error: 'Unable to reset password.' }, { status: 500 });
  }
}
