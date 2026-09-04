import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { createDiningBookingForUser, listBookings } from '@/src/services/dining-service';
import { createUser, findUserByEmail } from '@/src/services/user-service';
import { randomBytes } from 'crypto';

export async function GET() {
  const user = await getSessionUser();
  if (!user || (!AuthorizationService.canAccess(user.role, 'bookings.view', user.permissions) && !AuthorizationService.canAccess(user.role, 'payments.view', user.permissions) && !AuthorizationService.canAccess(user.role, 'payments.manage', user.permissions))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const bookings = await listBookings();
  return NextResponse.json({ success: true, data: bookings });
}

export async function POST(request: Request) {
  const actor = await getSessionUser();
  if (!actor || !AuthorizationService.canAccess(actor.role, 'bookings.manage', actor.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const body = await request.json() as Record<string, unknown>;
    let customer = body.email ? await findUserByEmail(String(body.email)) : null;
    if (!customer) {
      const mobile = String(body.mobile || '').trim();
      const name = String(body.name || 'Walk-in customer').trim();
      if (!mobile) return NextResponse.json({ error: 'Customer mobile is required.' }, { status: 400 });
      customer = await createUser({ name, email: `walkin-${Date.now()}-${randomBytes(3).toString('hex')}@local.invalid`, mobile, password: randomBytes(24).toString('hex'), role: 'CUSTOMER', accountStatus: 'ACTIVE' });
    }
    const booking = await createDiningBookingForUser({ userId: customer._id!.toHexString(), roomId: String(body.roomId || ''), bookingDate: String(body.bookingDate || ''), startTime: String(body.startTime || ''), guestCount: Number(body.guestCount || 1), roomCount: Number(body.roomCount || 1), durationMinutes: Number(body.durationMinutes || 60), customerNote: typeof body.note === 'string' ? body.note.slice(0, 500) : null, paymentMethod: body.paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD', couponCode: null, idempotencyKey: typeof body.idempotencyKey === 'string' ? `manual:${body.idempotencyKey}` : null });
    return NextResponse.json({ success: true, data: booking });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to create manual booking.' }, { status: 400 }); }
}
