import { NextResponse } from 'next/server';
import { createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/src/auth/session';
import { createUser, findUserByEmail, isUserEligibleForSession } from '@/src/services/user-service';
import { env } from '@/src/config/env';

export async function POST(request: Request) {
  try {
    if (!env.MONGODB_URI) {
      return NextResponse.json({ error: 'MongoDB connection requires MONGODB_URI in .env.local.' }, { status: 503 });
    }

    const body = (await request.json()) as Record<string, unknown>;
    const name = String(body?.name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const mobile = String(body?.mobile || '').trim();
    const password = String(body?.password || '');
    const confirmPassword = String(body?.confirmPassword || '');

    if (!name || !email || !password || !confirmPassword) {
      return NextResponse.json({ error: 'Please complete all required fields.' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
    }

    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match.' }, { status: 400 });
    }

    if (mobile && !/^[0-9()+\-\s]{8,20}$/.test(mobile)) {
      return NextResponse.json({ error: 'Please provide a valid mobile number.' }, { status: 400 });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json({ error: 'An account with that email already exists.' }, { status: 409 });
    }

    const user = await createUser({
      name,
      email,
      mobile: mobile || null,
      password,
      role: 'CUSTOMER',
      accountStatus: 'ACTIVE',
    });

    if (!isUserEligibleForSession(user)) {
      return NextResponse.json({ error: 'Unable to create account at this time.' }, { status: 403 });
    }

    const token = await createSession(user.id as string);
    const responseBody: {
      success: true;
      user: { id: string | undefined; name: string; email: string; role: string };
      sessionToken?: string;
    } = { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
    // For development and smoke tests include the raw token in the response body so test harnesses can capture it.
    if (env.NODE_ENV !== 'production') {
      responseBody.sessionToken = token;
    }

    const response = NextResponse.json(responseBody);
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: SESSION_MAX_AGE_SECONDS,
    });

    // Expose token via a non-sensitive header in non-production to help smoke-test harnesses
    if (env.NODE_ENV !== 'production') {
      response.headers.set('x-pizzavizza-session', token);
    }

    return response;
  } catch (error) {
    console.error('Registration failed', error);
    return NextResponse.json({ error: 'Registration failed. Please try again later.' }, { status: 500 });
  }
}
