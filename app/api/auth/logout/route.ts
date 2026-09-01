import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from '@/src/auth/session';
import { env } from '@/src/config/env';

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
