import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { listOrdersForDeliveryStaff, listOrdersForUser } from '@/src/models/order';

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const userId = user._id?.toHexString() || user.id || '';
  const orders = user.role === 'DELIVERY_STAFF' ? await listOrdersForDeliveryStaff(userId) : await listOrdersForUser(userId);
  const safeOrders = orders.map((order) => {
    const safe = { ...order };
    const canSeeOtp = user.role !== 'DELIVERY_STAFF';
    if (!canSeeOtp) {
      delete safe.deliveryOtpCode;
      delete safe.deliveryOtpHash;
      delete safe.deliveryOtpExpiresAt;
      delete safe.deliveryOtpAttempts;
      delete safe.deliveryOtpLastAttemptAt;
    }
    return safe;
  });
  return NextResponse.json({ success: true, data: safeOrders });
}
