import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { getSessionUser } from '@/src/auth/session';
import { getUsersCollection, UserDocument } from '@/src/models/user';
import { recordAudit } from '@/src/models/audit-log';
import { comparePassword, hashPassword, incrementProfileVerificationAttempt, reserveProfileVerification } from '@/src/services/user-service';
import { sendProfileVerificationEmail } from '@/src/services/email-service';

function userId(user: UserDocument) {
  return user._id?.toHexString() || user.id || '';
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });
  if (!user.emailVerified) return NextResponse.json({ error: 'Verify your email before verifying your mobile number.' }, { status: 400 });
  if (!user.mobile) return NextResponse.json({ error: 'Add a mobile number before verifying it.' }, { status: 400 });

  try {
    const code = randomInt(100000, 1000000).toString();
    const reserved = await reserveProfileVerification(userId(user), {
      purpose: 'MOBILE_VERIFICATION',
      codeHash: await hashPassword(code),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      pendingName: user.name,
      pendingEmail: user.email,
      pendingMobile: user.mobile,
    });
    if (!reserved.modifiedCount) return NextResponse.json({ error: 'Please wait one minute before requesting another code.' }, { status: 429 });
    await sendProfileVerificationEmail(user.email, user.name, code);
    return NextResponse.json({ success: true, message: 'Mobile verification code sent to your verified email.' });
  } catch (error) {
    console.error('Mobile verification request failed', error);
    return NextResponse.json({ error: 'Unable to send mobile verification code.' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  try {
    const body = await request.json() as { code?: string };
    const code = String(body.code || '').trim();
    if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: 'Enter the six-digit verification code.' }, { status: 400 });
    const current = await incrementProfileVerificationAttempt(userId(user));
    const verification = current?.profileVerification;
    if (!verification || verification.purpose !== 'MOBILE_VERIFICATION' || verification.expiresAt < new Date() || !(await comparePassword(code, verification.codeHash))) {
      await recordAudit({ type: 'MOBILE_VERIFICATION_FAILED', performedBy: userId(user), newValue: { reason: 'invalid_or_expired_code' } });
      return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 400 });
    }
    const updated = await (await getUsersCollection()).findOneAndUpdate(
      { _id: user._id, 'profileVerification.codeHash': verification.codeHash, mobile: verification.pendingMobile },
      { $set: { mobileVerified: true, lastProfileUpdateAt: new Date(), updatedAt: new Date() }, $unset: { profileVerification: '' } },
      { returnDocument: 'after' },
    );
    if (!updated) return NextResponse.json({ error: 'Mobile number changed already. Request a new verification code.' }, { status: 409 });
    await recordAudit({ type: 'MOBILE_VERIFIED', performedBy: userId(user), newValue: { mobile: updated.mobile } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mobile verification failed', error);
    return NextResponse.json({ error: 'Unable to verify mobile number.' }, { status: 500 });
  }
}