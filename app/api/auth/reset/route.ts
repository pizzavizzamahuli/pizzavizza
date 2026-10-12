import { NextResponse } from 'next/server';
import { comparePassword, findUserByEmail, normalizeEmail, incrementPasswordResetAttempt, findUserByPhonePasswordResetToken, consumePhonePasswordResetToken, consumeEmailPasswordResetCode } from '@/src/services/user-service';
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
    const action = String(body?.action || '');
    const password = String(body?.password || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if (action === 'verify-email-code') {
      if (method !== 'email' || !email || !code) {
        return NextResponse.json({ error: 'Email and reset code are required.' }, { status: 400 });
      }

      const user = await findUserByEmail(email);
      if (!user || user.passwordReset?.method !== 'EMAIL_OTP' || !user.passwordReset.codeHash) {
        return NextResponse.json({ error: 'Invalid reset code or expired link.' }, { status: 401 });
      }
      if (user.passwordReset.expiresAt < new Date()) {
        return NextResponse.json({ error: 'Reset code has expired.' }, { status: 401 });
      }

      const reset = user.passwordReset;
      const codeHash = reset.codeHash;
      if (!codeHash || (reset.attempts ?? 0) >= 5) {
        return NextResponse.json({ error: 'Invalid reset code or expired link.' }, { status: 401 });
      }
      if (!(await comparePassword(code, codeHash))) {
        await incrementPasswordResetAttempt(user._id?.toHexString() || user.id || '');
        return NextResponse.json({ error: 'Invalid reset code or expired link.' }, { status: 401 });
      }

      return NextResponse.json({ success: true, verified: true });
    }

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
    if (!user || !user.passwordReset || (method === 'email' && user.passwordReset.method !== 'EMAIL_OTP')) {
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
      const consumed = await consumeEmailPasswordResetCode(userId, reset.codeHash || '', password);
      if (!consumed.modifiedCount) {
        return NextResponse.json({ error: 'Invalid reset code or expired link.' }, { status: 401 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reset password failed', error);
    return NextResponse.json({ error: 'Unable to reset password.' }, { status: 500 });
  }
}
