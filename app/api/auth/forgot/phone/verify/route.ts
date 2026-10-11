import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { env } from '@/src/config/env';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { getFirebaseAdminAuth, isFirebaseAdminConfigured } from '@/src/services/firebase-admin-service';
import { findUserByVerifiedPhoneNumber, hashPassword, reservePhonePasswordResetForUser } from '@/src/services/user-service';

export async function POST(request: Request) {
  try {
    if (!env.MONGODB_URI) {
      return NextResponse.json({ error: 'MongoDB connection requires MONGODB_URI in .env.local.' }, { status: 503 });
    }

    const settings = await getRestaurantSettings();
    if (settings.passwordResetOtpMode === 'EMAIL_ONLY') {
      return NextResponse.json({ error: 'Phone password reset is currently unavailable.' }, { status: 400 });
    }

    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json({ error: 'Phone password reset is not configured.' }, { status: 503 });
    }

    const body = await request.json();
    const idToken = String(body?.idToken || '').trim();
    if (!idToken) {
      return NextResponse.json({ error: 'Phone verification token is required.' }, { status: 400 });
    }

    const decodedToken = await getFirebaseAdminAuth().verifyIdToken(idToken, true);
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (
      decodedToken.firebase.sign_in_provider !== 'phone' ||
      !Number.isSafeInteger(decodedToken.auth_time) ||
      decodedToken.auth_time > nowSeconds ||
      nowSeconds - decodedToken.auth_time > 5 * 60
    ) {
      return NextResponse.json({ error: 'Phone verification token is invalid or expired.' }, { status: 401 });
    }

    const phoneNumber = typeof decodedToken.phone_number === 'string' ? decodedToken.phone_number : '';
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone verification token is invalid or expired.' }, { status: 401 });
    }

    const user = await findUserByVerifiedPhoneNumber(phoneNumber);
    if (!user) {
      return NextResponse.json({ success: true, resetToken: null });
    }

    const token = randomBytes(32).toString('base64url');
    const tokenHash = await hashPassword(token);
    const reserved = await reservePhonePasswordResetForUser(user._id?.toHexString() || user.id || '', tokenHash, new Date(Date.now() + 10 * 60 * 1000), phoneNumber);
    if (!reserved.modifiedCount) {
      return NextResponse.json({ success: true, resetToken: null });
    }

    return NextResponse.json({ success: true, resetToken: token, expiresInSeconds: 600 });
  } catch (error) {
    console.error('Phone password reset verification failed', error);
    return NextResponse.json({ error: 'Unable to verify phone reset request.' }, { status: 500 });
  }
}
