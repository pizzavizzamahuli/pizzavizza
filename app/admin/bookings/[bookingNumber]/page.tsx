import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findDiningBookingByBookingNumber } from '@/src/models/dining-booking';
import { notFound } from 'next/navigation';
import { BookingStatusActions } from '@/src/components/admin/booking-actions';

export default async function AdminBookingDetailPage({ params }: { params: Promise<{ bookingNumber: string }> }) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'bookings.view')) return notFound();

  const { bookingNumber } = await params;
  const booking = await findDiningBookingByBookingNumber(bookingNumber);
  if (!booking) return notFound();

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Booking Details</p>
        <h1 className="mt-3 text-3xl font-semibold text-stone-900">{booking.bookingNumber}</h1>
        <p className="mt-2 text-sm text-stone-600">{booking.roomSnapshot.name} on {booking.bookingDate} at {booking.startTime}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Reservation</h2>
          <dl className="mt-4 space-y-3 text-sm text-stone-600">
            <div>
              <dt className="font-medium text-stone-900">Room</dt>
              <dd>{booking.roomSnapshot.name}</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Guests</dt>
              <dd>{booking.guestCount}</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Duration</dt>
              <dd>{booking.durationMinutes} minutes</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Status</dt>
              <dd>{booking.bookingStatus}</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Payment method</dt>
              <dd>{booking.paymentMethod || 'Not selected'}</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Payment status</dt>
              <dd>{booking.paymentStatus}</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Transaction ID</dt>
              <dd>{booking.transactionId || 'Not submitted'}</dd>
            </div>
            <div>
              <dt className="font-medium text-stone-900">Total</dt>
              <dd>₹{booking.finalAmount.toFixed(2)}</dd>
            </div>
          </dl>
          {booking.paymentProofUrl ? <a href={booking.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white">View payment proof</a> : null}
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-stone-900">Customer</h2>
          <p className="mt-4 text-sm text-stone-600">{booking.customerSnapshot.name}</p>
          <p className="text-sm text-stone-600">{booking.customerSnapshot.email}</p>
          <p className="text-sm text-stone-600">{booking.customerSnapshot.mobile}</p>
          <div className="mt-6">
            <h3 className="text-base font-semibold text-stone-900">Customer note</h3>
            <p className="mt-2 text-sm text-stone-600">{booking.customerNote || 'No additional notes provided.'}</p>
          </div>
        </section>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Update booking status</h2>
        <BookingStatusActions
          bookingNumber={booking.bookingNumber}
          currentStatus={booking.bookingStatus}
          currentPaymentStatus={booking.paymentStatus}
          currentPaymentMethod={booking.paymentMethod}
        />
      </div>
    </div>
  );
}
