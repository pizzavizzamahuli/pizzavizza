import { createHmac, timingSafeEqual } from 'crypto';
import { UserDocument } from '@/src/models/user';
import { getUserById, isUserEligibleForSession } from '@/src/services/user-service';

export const SESSION_COOKIE_NAME = 'pizzavizza_session';
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

async function getAuthSecret() {
  const { env } = await import('@/src/config/env');
  if (!env.AUTH_SECRET) {
    throw new Error('AUTH_SECRET is not configured.');
  }
  return env.AUTH_SECRET;
}

async function signPayload(payload: string) {
  const secret = await getAuthSecret();
  return createHmac('sha256', secret).update(payload).digest('hex');
}

function createSessionToken(userId: string, timestamp: string, signature: string) {
  const payload = `${userId}:${timestamp}`;
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

export async function parseSessionToken(token: string) {
  try {
    // tolerate tokens that have been url-encoded when sent as Cookie header
    const raw = normalizeSessionToken(token);
    let decoded: string;
    try {
      decoded = Buffer.from(raw, 'base64').toString('utf-8');
    } catch {
      return null;
    }
    const [userId, timestampString, signature] = decoded.split(':');

    if (!userId || !timestampString || !signature) {
      return null;
    }

    const payload = `${userId}:${timestampString}`;
    const expectedSignature = await signPayload(payload);
    const signatureBuffer = Buffer.from(signature, 'utf-8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf-8');

    if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
      return null;
    }

    const timestamp = Number(timestampString);
    if (Number.isNaN(timestamp) || timestamp <= 0) {
      return null;
    }

    if (Date.now() - timestamp > SESSION_MAX_AGE_SECONDS * 1000) {
      return null;
    }

    return userId;
  } catch {
    return null;
  }
}

export function normalizeSessionToken(token: string) {
  let raw = token;
  try {
    // tolerate repeated percent-encoding (some clients may double-encode)
    for (let i = 0; i < 3 && /%[0-9A-Fa-f]{2}/.test(raw); i++) {
      raw = decodeURIComponent(raw);
    }
  } catch {
    // ignore decode errors
  }
  // some clients replace '+' with space; restore common base64 chars
  raw = raw.replace(/\s/g, '+');
  return raw;
}

export async function createSession(userId: string) {
  const timestamp = Date.now().toString();
  const payload = `${userId}:${timestamp}`;
  const signature = await signPayload(payload);
  return createSessionToken(userId, timestamp, signature);
}

export async function destroySession() {
  // Return an explicit empty token that callers can set as the cookie value
  // with maxAge=0 to instruct browsers to clear it.
  return '';
}

export async function getSessionUser(request?: Request): Promise<UserDocument | null> {
  if (typeof window !== 'undefined') {
    // Running in the browser — no server cookies available
    return null;
  }

  let sessionValue: string | undefined | null = undefined;

  // If a Request object is provided (Route Handlers), read headers/cookie from it
  if (request) {
    try {
      const reqCookie = request.headers.get('cookie');
      if (reqCookie) {
        const match = reqCookie.split(';').map((s) => s.trim()).find((s) => s.startsWith(SESSION_COOKIE_NAME + '='));
        if (match) sessionValue = match.split('=').slice(1).join('=');
      }
      if (!sessionValue) {
        sessionValue = request.headers.get('x-pizzavizza-session') || request.headers.get('x-session-token') || undefined;
      }
    } catch {
      // ignore
    }
  }

  // Fallback to Next headers/cookies API (server components)
  if (!sessionValue) {
    const { cookies } = await import('next/headers');
    const cookieStore = await cookies();
    sessionValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  }

  let token = sessionValue;
  if (!token) {
    // fallback: some test harnesses or proxies may supply the raw token via a header
    try {
      const { headers } = await import('next/headers');
      const h = await headers();
      const headerToken = h.get('x-pizzavizza-session') || h.get('x-session-token');
      if (headerToken) token = headerToken;
    } catch {
      // ignore
    }
  }

  if (!token) {
    return null;
  }

  const userId = await parseSessionToken(token);
  if (!userId) {
    try {
      // short preview for debugging only
      console.warn('Session token failed to parse (preview):', typeof token === 'string' ? token.slice(0, 40) : token);
    } catch {}
    return null;
  }

  try {
    const user = await getUserById(userId);
    if (!user || !isUserEligibleForSession(user)) return null;
    return user;
  } catch {
    return null;
  }
}
