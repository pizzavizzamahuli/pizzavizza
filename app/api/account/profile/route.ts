import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import { getSessionUser } from '@/src/auth/session';
import { getUsersCollection, UserDocument } from '@/src/models/user';
import { recordAudit } from '@/src/models/audit-log';
import { comparePassword, incrementProfileVerificationAttempt, isValidMobile, normalizeEmail, reserveProfileVerification, hashPassword, setEmailVerification } from '@/src/services/user-service';
import { sendEmailVerificationEmail, sendProfileVerificationEmail } from '@/src/services/email-service';

function userId(user: UserDocument) {
  return user._id?.toHexString() || user.id || '';
}

function publicUser(user: UserDocument) {
  return {
    id: userId(user),
    userCode: user.userCode || null,
    name: user.name,
    email: user.email,
    mobile: user.mobile || null,
    role: user.role,
    emailVerified: user.emailVerified === true,
    mobileVerified: user.mobileVerified === true,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastProfileUpdateAt: user.lastProfileUpdateAt || null,
    lastPasswordChangeAt: user.lastPasswordChangeAt || null,
  };
}

export async function POST(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  try {
    const body = await request.json() as { name?: string; email?: string; mobile?: string | null };
    const name = String(body.name || '').trim();
    const email = normalizeEmail(String(body.email || ''));
    const mobile = String(body.mobile || '').trim() || null;
    if (name.length < 2 || name.length > 100) return NextResponse.json({ error: 'Please provide a valid name.' }, { status: 400 });
    if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ error: 'Please provide a valid email address.' }, { status: 400 });
    if (mobile && !isValidMobile(mobile)) return NextResponse.json({ error: 'Please provide a valid mobile number.' }, { status: 400 });
    if (mobile && mobile !== user.mobile) {
      const duplicate = await (await getUsersCollection()).findOne({ mobile, _id: { $ne: user._id } }, { projection: { _id: 1 } });
      if (duplicate) return NextResponse.json({ error: 'Mobile number is already registered.' }, { status: 409 });
    }
    if (email !== user.email) {
      const duplicate = await (await getUsersCollection()).findOne({ email, _id: { $ne: user._id } }, { projection: { _id: 1 } });
      if (duplicate) return NextResponse.json({ error: 'Email address is already in use.' }, { status: 409 });
    }
    if (name === user.name && email === user.email && mobile === (user.mobile || null)) {
      return NextResponse.json({ success: true, requiresVerification: false, user: publicUser(user) });
    }
    if (!user.emailVerified) return NextResponse.json({ error: 'Verify your current email before changing profile details.' }, { status: 400 });

    const code = randomInt(100000, 1000000).toString();
    const reserved = await reserveProfileVerification(userId(user), {
      codeHash: await hashPassword(code),
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      pendingName: name,
      pendingEmail: email,
      pendingMobile: mobile,
    });
    if (!reserved.modifiedCount) return NextResponse.json({ error: 'Please wait one minute before requesting another code.' }, { status: 429 });
    await sendProfileVerificationEmail(user.email, user.name, code);
    return NextResponse.json({ success: true, requiresVerification: true, message: 'Verification code sent to your current verified email.' });
  } catch (error) {
    console.error('Profile update request failed', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to request profile update.' }, { status: 500 });
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
    if (!verification || (verification.purpose && verification.purpose !== 'PROFILE_UPDATE') || verification.expiresAt < new Date() || !(await comparePassword(code, verification.codeHash))) {
      await recordAudit({ type: 'PROFILE_VERIFICATION_FAILED', performedBy: userId(user), newValue: { reason: 'invalid_or_expired_code' } });
      return NextResponse.json({ error: 'Invalid or expired verification code.' }, { status: 400 });
    }
    const collection = await getUsersCollection();
    const emailChanged = verification.pendingEmail !== user.email;
    const mobileChanged = verification.pendingMobile !== (user.mobile || null);
    const updated = await collection.findOneAndUpdate(
      { _id: user._id, 'profileVerification.codeHash': verification.codeHash },
      {
        $set: {
          name: verification.pendingName,
          email: verification.pendingEmail,
          mobile: verification.pendingMobile,
          emailVerified: emailChanged ? false : user.emailVerified,
          mobileVerified: mobileChanged ? verification.pendingMobile !== null : user.mobileVerified === true,
          lastProfileUpdateAt: new Date(),
          updatedAt: new Date(),
        },
        $unset: { profileVerification: '' },
      },
      { returnDocument: 'after' },
    );
    if (!updated) return NextResponse.json({ error: 'Profile changed already. Please request a new code.' }, { status: 409 });
    if (emailChanged) {
      const verificationCode = randomInt(100000, 1000000).toString();
      await setEmailVerification(userId(updated), await hashPassword(verificationCode), new Date(Date.now() + 15 * 60 * 1000));
      await sendEmailVerificationEmail(updated.email, updated.name, verificationCode);
    }
    await recordAudit({ type: 'PROFILE_UPDATED', performedBy: userId(user), oldValue: { name: user.name, email: user.email, mobile: user.mobile || null }, newValue: { name: updated.name, email: updated.email, mobile: updated.mobile || null } });
    return NextResponse.json({ success: true, user: publicUser(updated) });
  } catch (error) {
    if (error instanceof Error && /duplicate|E11000/i.test(error.message)) {
      return NextResponse.json({ error: 'Email address or mobile number is already in use.' }, { status: 409 });
    }
    console.error('Profile verification failed', error);
    return NextResponse.json({ error: 'Unable to verify profile update.' }, { status: 500 });
  }
}