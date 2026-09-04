import { NextResponse } from 'next/server';
import { createSession, SESSION_COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from '@/src/auth/session';
import { comparePassword, findUserByLoginIdentifier, isUserEligibleForSession } from '@/src/services/user-service';
import { env } from '@/src/config/env';

export async function POST(request: Request) {
  try {
    if (!env.MONGODB_URI) {
      return NextResponse.json({ error: 'MongoDB connection requires MONGODB_URI in .env.local.' }, { status: 503 });
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (err) {
      try {
        const raw = await request.text();
        console.error('Login failed parsing JSON body:', raw, err);
      } catch (e) {
        console.error('Login failed and could not read body', err, e);
      }
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
    }
    const identifier = String(body?.identifier || body?.email || body?.mobile || '').trim();
    const password = String(body?.password || '');

    if (!identifier || !password) {
      return NextResponse.json({ error: 'Email/mobile and password are required.' }, { status: 400 });
    }

    const user = await findUserByLoginIdentifier(identifier);
    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (!user.emailVerified && user.emailVerification) {
      return NextResponse.json({ error: 'Please verify your email before signing in.', requiresEmailVerification: true }, { status: 403 });
    }
    if (user.mobile && user.mobileVerified === false) return NextResponse.json({ error: 'Please verify your mobile number before signing in.', requiresMobileVerification: true }, { status: 403 });

    if (user.accountStatus === 'DISABLED' || user.accountStatus === 'SUSPENDED') {
      return NextResponse.json({ error: 'This account is disabled or suspended.' }, { status: 403 });
    }

    const isValidPassword = await comparePassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 });
    }

    if (!isUserEligibleForSession(user)) {
      return NextResponse.json(
        { error: 'This account is not active or access is restricted.' },
        { status: 403 }
      );
    }

    const token = await createSession(user._id?.toHexString() || user.id || '');
    const adminRoles = ['MAIN_ADMIN', 'ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'];
    const requiresPasswordChange = user.temporaryAccess?.enabled && user.temporaryAccess.forcePasswordChange;
    const roleRedirect = user.role === 'MANAGER' ? '/manager' : user.role === 'KITCHEN_STAFF' ? '/kitchen' : user.role === 'DELIVERY_STAFF' ? '/delivery' : '/admin';
    const redirectTo = requiresPasswordChange ? '/account/change-password' : adminRoles.includes(user.role) ? roleRedirect : '/account';
    const responseBody: {
      success: true;
      redirect: string;
      user: { id: string | undefined; name: string; email: string; role: string };
      sessionToken?: string;
    } = {
      success: true,
      redirect: redirectTo,
      user: { id: user._id?.toHexString() || user.id, name: user.name, email: user.email, role: user.role },
    };
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

    if (env.NODE_ENV !== 'production') {
      response.headers.set('x-pizzavizza-session', token);
    }

    return response;
  } catch (error) {
    console.error('Login failed', error);
    return NextResponse.json({ error: 'Login failed. Please try again later.' }, { status: 500 });
  }
}
