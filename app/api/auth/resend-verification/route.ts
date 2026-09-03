import { NextResponse } from 'next/server';
import { findUserByEmail, hashPassword, reserveEmailVerificationResend } from '@/src/services/user-service';
import { sendEmailVerificationEmail } from '@/src/services/email-service';
import { randomInt } from 'crypto';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string };
    const email = String(body.email || '').trim().toLowerCase();
    if (!email) return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    const user = await findUserByEmail(email);
    if (!user || user.emailVerified) return NextResponse.json({ success: true });
    const code = randomInt(100000, 1000000).toString();
    const reserved = await reserveEmailVerificationResend(user._id!.toHexString(), await hashPassword(code), new Date(Date.now() + 15 * 60 * 1000));
    if (!reserved.modifiedCount) return NextResponse.json({ error: 'Please wait one minute before requesting another code.' }, { status: 429 });
    await sendEmailVerificationEmail(user.email, user.name, code);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Resend email verification failed', error);
    return NextResponse.json({ error: 'Unable to resend verification code.' }, { status: 500 });
  }
}