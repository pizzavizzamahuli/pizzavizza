import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findDiningBookingByBookingNumber } from '@/src/models/dining-booking';
import { canTransitionDiningBookingStatus, type DiningBookingStatus } from '@/src/models/dining-booking';
import { updateBookingStatus } from '@/src/services/dining-service';

export async function PUT(request: Request, context: { params: Promise<{ bookingNumber: string }> }) {
  const { bookingNumber } = await context.params;
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'bookings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const booking = await findDiningBookingByBookingNumber(bookingNumber);
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  try {
    const payload = await request.json();
    const { status } = payload;
    if (!status) return NextResponse.json({ error: 'status is required' }, { status: 400 });

    const validStatuses: DiningBookingStatus[] = ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid booking status' }, { status: 400 });
    }
    if (!canTransitionDiningBookingStatus(booking.bookingStatus, status as DiningBookingStatus)) {
      return NextResponse.json({ error: `Cannot change booking from ${booking.bookingStatus} to ${status}.` }, { status: 409 });
    }

    const updatedBooking = await updateBookingStatus(booking._id!.toHexString(), status as DiningBookingStatus, user._id!.toHexString(), `Status updated to ${status}`);

    return NextResponse.json({ success: true, data: updatedBooking });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update booking';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
