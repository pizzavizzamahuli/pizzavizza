import { NextResponse } from 'next/server';
import { comparePassword, findUserByEmail, incrementEmailVerificationAttempt, markEmailVerified } from '@/src/services/user-service';
import { createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/src/auth/session';
import { env } from '@/src/config/env';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; code?: string };
    const email = String(body.email || '').trim().toLowerCase();
    const code = String(body.code || '').trim();
    if (!email || !/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Email and a six-digit code are required.' }, { status: 400 });
    const user = await findUserByEmail(email);
    if (!user || user.emailVerified || !user.emailVerification) return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 400 });
    if (user.emailVerification.expiresAt < new Date() || user.emailVerification.attempts >= 5) return NextResponse.json({ error: 'Verification code expired or locked. Request a new code.' }, { status: 400 });
    const updated = await incrementEmailVerificationAttempt(user._id!.toHexString());
    if (!updated || !updated.emailVerification || !(await comparePassword(code, updated.emailVerification.codeHash))) return NextResponse.json({ error: 'Invalid verification code.' }, { status: 400 });
    await markEmailVerified(user._id!.toHexString());
    const token = await createSession(user._id!.toHexString());
    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, token, { httpOnly: true, secure: env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: SESSION_MAX_AGE_SECONDS });
    return response;
  } catch (error) {
    console.error('Email verification failed', error);
    return NextResponse.json({ error: 'Unable to verify email.' }, { status: 500 });
  }
}