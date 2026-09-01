import { NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/src/auth/session';
import { env } from '@/src/config/env';

export async function POST(request: Request) {
  const isProduction = env.NODE_ENV === 'production';

  // Disallow in production
  if (isProduction) {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  // Gate behind explicit feature flag for local/dev usage
  if (!env.ENABLE_FORCE_LOGIN) {
    return NextResponse.json({ error: 'Force-login disabled' }, { status: 403 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === 'string' ? body.token : '';
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const response = NextResponse.json({ success: true });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err) {
    console.error('force-login failed', err);
    return NextResponse.json({ error: 'Failed to set session' }, { status: 500 });
  }
}
