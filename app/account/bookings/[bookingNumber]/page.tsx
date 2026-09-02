import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { getBookingForUser } from '@/src/services/dining-service';
import { CustomerShell } from '@/src/app-shell';
import BookingCancelButton from '@/src/components/dining/booking-cancel-button';

export default async function BookingDetailPage({ params }: { params: Promise<{ bookingNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const { bookingNumber } = await params;
  const booking = await getBookingForUser(user._id!.toHexString(), bookingNumber);
  if (!booking) notFound();
  const canCancel = booking.bookingStatus === 'PENDING' || booking.bookingStatus === 'CONFIRMED';

  return (
    <CustomerShell>
      <div className="mx-auto max-w-3xl space-y-5">
        <Link href="/account/bookings" className="inline-flex min-h-11 items-center text-sm font-semibold text-amber-700">Back to reservations</Link>
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Reservation details</p>
          <h1 className="mt-2 break-words text-2xl font-semibold text-stone-900">{booking.bookingNumber}</h1>
          <dl className="mt-6 grid gap-4 text-sm text-stone-600 sm:grid-cols-2">
            <div><dt className="font-semibold text-stone-900">Dining room</dt><dd>{booking.roomSnapshot.name}</dd></div>
            <div><dt className="font-semibold text-stone-900">Date and time</dt><dd>{booking.bookingDate}, {booking.startTime} to {booking.endTime}</dd></div>
            <div><dt className="font-semibold text-stone-900">Guests</dt><dd>{booking.guestCount}</dd></div>
            <div><dt className="font-semibold text-stone-900">Amount</dt><dd>₹{booking.finalAmount.toFixed(2)}</dd></div>
            <div><dt className="font-semibold text-stone-900">Reservation status</dt><dd>{booking.bookingStatus}</dd></div>
            <div><dt className="font-semibold text-stone-900">Payment status</dt><dd>{booking.paymentStatus}</dd></div>
          </dl>
          {booking.customerNote ? <p className="mt-6 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">{booking.customerNote}</p> : null}
          {canCancel ? <BookingCancelButton bookingNumber={booking.bookingNumber} /> : <p className="mt-6 text-sm text-stone-600">This reservation cannot be cancelled in its current status.</p>}
        </section>
      </div>
    </CustomerShell>
  );
}