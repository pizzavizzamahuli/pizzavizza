import { NextResponse } from 'next/server';
import { comparePassword, findUserByLoginIdentifier, incrementMobileVerificationAttempt, markMobileVerified } from '@/src/services/user-service';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { mobile?: string; code?: string };
    const mobile = String(body.mobile || '').trim();
    const code = String(body.code || '').trim();
    if (!mobile || !/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Mobile number and a six-digit code are required.' }, { status: 400 });
    const user = await findUserByLoginIdentifier(mobile);
    if (!user || user.mobileVerified || !user.mobileVerification || user.mobileVerification.expiresAt < new Date() || user.mobileVerification.attempts >= 5) return NextResponse.json({ error: 'Invalid or expired mobile verification code.' }, { status: 400 });
    const updated = await incrementMobileVerificationAttempt(user._id!.toHexString());
    if (!updated?.mobileVerification || !(await comparePassword(code, updated.mobileVerification.codeHash))) return NextResponse.json({ error: 'Invalid mobile verification code.' }, { status: 400 });
    await markMobileVerified(user._id!.toHexString());
    return NextResponse.json({ success: true });
  } catch (error) { console.error('Mobile verification failed', error); return NextResponse.json({ error: 'Unable to verify mobile number.' }, { status: 500 }); }
}