import { NextResponse } from 'next/server';
import { env } from '@/src/config/env';
import { findUserByEmail, setPasswordResetForUser, normalizeEmail, hashPassword } from '@/src/services/user-service';
import { sendPasswordResetEmail } from '@/src/services/email-service';
import { randomInt } from 'crypto';

export async function POST(request: Request) {
  try {
    if (!env.MONGODB_URI) {
      return NextResponse.json({ error: 'MongoDB connection requires MONGODB_URI in .env.local.' }, { status: 503 });
    }

    const body = await request.json();
    const email = normalizeEmail(String(body?.email || ''));

    if (!email) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return NextResponse.json({ success: true });
    }

    const code = randomInt(100000, 999999).toString();
    const codeHash = await hashPassword(code);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15);

    await setPasswordResetForUser(user._id?.toHexString() || user.id || '', codeHash, expiresAt);
    await sendPasswordResetEmail(user.email, user.name, code);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password reset request failed', error);
    return NextResponse.json({ error: 'Unable to process reset request.' }, { status: 500 });
  }
}
