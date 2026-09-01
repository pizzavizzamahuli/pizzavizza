import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findDiningBookingByBookingNumber, updateDiningBooking } from '@/src/models/dining-booking';

export async function PUT(request: Request, context: unknown) {
  const { params } = context as { params: { bookingNumber: string } };
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'bookings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const booking = await findDiningBookingByBookingNumber(params.bookingNumber);
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  try {
    const payload = await request.json();
    const { status } = payload;
    if (!status) return NextResponse.json({ error: 'status is required' }, { status: 400 });

    const validStatuses = ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid booking status' }, { status: 400 });
    }

    const updatedBooking = await updateDiningBooking(booking._id!.toHexString(), {
      bookingStatus: status,
      statusHistory: [
        ...(booking.statusHistory || []),
        { previousStatus: booking.bookingStatus, newStatus: status, performedBy: user._id!.toHexString(), note: `Status updated to ${status}`, createdAt: new Date() },
      ],
    });

    return NextResponse.json({ success: true, data: updatedBooking });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update booking';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
