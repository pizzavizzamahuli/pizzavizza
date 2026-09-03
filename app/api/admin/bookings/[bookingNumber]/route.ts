import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findDiningBookingByBookingNumber } from '@/src/models/dining-booking';
import { canTransitionDiningBookingStatus, type DiningBookingStatus } from '@/src/models/dining-booking';
import { updateBookingStatus } from '@/src/services/dining-service';
import { notifyUser } from '@/src/services/notification-service';

export async function PUT(request: Request, context: { params: Promise<{ bookingNumber: string }> }) {
  const { bookingNumber } = await context.params;
  const user = await getSessionUser();
  if (!user || (!AuthorizationService.canAccess(user.role, 'bookings.manage') && !AuthorizationService.canAccess(user.role, 'payments.manage'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const booking = await findDiningBookingByBookingNumber(bookingNumber);
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
  }

  try {
    const payload = await request.json();
    const { status, paymentStatus, extendMinutes } = payload;

    if (typeof status === 'string') {
      const validStatuses: DiningBookingStatus[] = ['PENDING', 'CONFIRMED', 'REJECTED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'];
      if (!validStatuses.includes(status as DiningBookingStatus)) {
        return NextResponse.json({ error: 'Invalid booking status' }, { status: 400 });
      }
      if (!canTransitionDiningBookingStatus(booking.bookingStatus, status as DiningBookingStatus)) {
        return NextResponse.json({ error: `Cannot change booking from ${booking.bookingStatus} to ${status}.` }, { status: 409 });
      }

      const updatedBooking = await updateBookingStatus(booking._id!.toHexString(), status as DiningBookingStatus, user._id!.toHexString(), `Status updated to ${status}`);
      if (updatedBooking) notifyUser(booking.userId, { type: `BOOKING_${status}`, title: `Booking ${status.toLowerCase()}`, message: `Your dining booking ${booking.bookingNumber} is now ${status.toLowerCase()}.`, href: `/account/bookings/${booking.bookingNumber}`, relatedType: 'booking', relatedId: booking.bookingNumber, eventKey: `booking:${booking.bookingNumber}:status:${status}` }).catch((error) => console.error('Booking notification failed', error));
      return NextResponse.json({ success: true, data: updatedBooking });
    }

    if (typeof paymentStatus === 'string') {
      const validPaymentStatus = ['PENDING', 'AWAITING_VERIFICATION', 'PAID', 'FAILED', 'SUSPICIOUS', 'REFUNDED', 'NOT_REQUIRED'];
      if (!validPaymentStatus.includes(paymentStatus)) {
        return NextResponse.json({ error: 'Invalid payment status' }, { status: 400 });
      }
      const { updateDiningBooking } = await import('@/src/models/dining-booking');
      const staffDiscountGiven = typeof payload.staffDiscountGiven === 'boolean' ? payload.staffDiscountGiven : undefined;
      const staffDiscountAmount = typeof payload.staffDiscountAmount === 'number' && Number.isFinite(payload.staffDiscountAmount) ? Math.max(0, payload.staffDiscountAmount) : undefined;
      const staffDiscountReason = typeof payload.staffDiscountReason === 'string' ? payload.staffDiscountReason.trim().slice(0, 500) : undefined;
      const result = await updateDiningBooking(booking._id!.toHexString(), {
        paymentStatus: paymentStatus as (typeof booking.paymentStatus),
        ...(staffDiscountGiven !== undefined ? { staffDiscountGiven, staffDiscountAmount: staffDiscountGiven ? staffDiscountAmount || 0 : 0, staffDiscountReason: staffDiscountGiven ? staffDiscountReason || null : null } : {}),
      });
      notifyUser(booking.userId, { type: `BOOKING_PAYMENT_${paymentStatus}`, title: `Booking payment ${paymentStatus.toLowerCase()}`, message: `Payment for booking ${booking.bookingNumber} is ${paymentStatus.toLowerCase()}.`, href: `/account/bookings/${booking.bookingNumber}`, relatedType: 'booking', relatedId: booking.bookingNumber, eventKey: `booking:${booking.bookingNumber}:payment:${paymentStatus}` }).catch((error) => console.error('Booking payment notification failed', error));
      return NextResponse.json({ success: true, data: result });
    }

    if (typeof extendMinutes === 'number' && Number.isFinite(extendMinutes) && extendMinutes > 0) {
      const nextEndMinutes = Number(String(booking.durationMinutes || 60)) + Number(extendMinutes);
      const updated = await (await import('@/src/models/dining-booking')).updateDiningBooking(booking._id!.toHexString(), {
        durationMinutes: nextEndMinutes,
        endTime: (await import('@/src/services/dining-service')).calculateBookingEndTime(booking.startTime, nextEndMinutes),
        updatedAt: new Date(),
      });
      return NextResponse.json({ success: true, data: updated });
    }

    return NextResponse.json({ error: 'No valid booking update provided.' }, { status: 400 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update booking';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
