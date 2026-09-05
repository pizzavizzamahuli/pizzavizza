import { NextResponse } from 'next/server';
import { createUser, findUserByEmail, hashPassword, setEmailVerification } from '@/src/services/user-service';
import { env } from '@/src/config/env';
import { createReferral, findReferralByCode, reserveReferralForUser } from '@/src/models/referral';
import { sendEmailVerificationEmail } from '@/src/services/email-service';
import { randomInt } from 'crypto';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

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
    const referralCode = String(body?.referralCode || '').trim().toUpperCase() || null;

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
    const referralSettings = await getRestaurantSettings();
    if (referralCode) {
      if (!referralSettings.referralEnabled) return NextResponse.json({ error: 'Referral programme is currently unavailable.' }, { status: 400 });
      const referral = await findReferralByCode(referralCode);
      if (!referral || !referral.isActive || referral.status !== 'PENDING') return NextResponse.json({ error: 'Invalid referral code.' }, { status: 400 });
    }

    const user = await createUser({
      name,
      email,
      mobile: mobile || null,
      password,
      role: 'CUSTOMER',
      accountStatus: 'ACTIVE',
      referredByReferralCode: referralCode,
    });

    if (referralCode) {
      const reserved = await reserveReferralForUser(referralCode, user.id as string);
      if (!reserved.modifiedCount) return NextResponse.json({ error: 'Invalid referral code.' }, { status: 400 });
    }
    if (referralSettings?.referralEnabled === true) {
      await createReferral(user.id as string);
    }

    const verificationCode = randomInt(100000, 1000000).toString();
    await setEmailVerification(user.id as string, await hashPassword(verificationCode), new Date(Date.now() + 15 * 60 * 1000));
    await sendEmailVerificationEmail(user.email, user.name, verificationCode);

    return NextResponse.json({ success: true, requiresEmailVerification: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    console.error('Registration failed', error);
    return NextResponse.json({ error: 'Registration failed. Please try again later.' }, { status: 500 });
  }
}
