import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { getBookingForUser } from '@/src/services/dining-service';
import { CustomerShell } from '@/src/app-shell';
import BookingCancelButton from '@/src/components/dining/booking-cancel-button';
import BookingSlipActions from '@/src/components/dining/booking-slip-actions';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

export default async function BookingDetailPage({ params }: { params: Promise<{ bookingNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const { bookingNumber } = await params;
  const booking = await getBookingForUser(user._id!.toHexString(), bookingNumber);
  if (!booking) notFound();
  const canCancel = booking.bookingStatus === 'PENDING' || booking.bookingStatus === 'CONFIRMED';
  const restaurantSettings = await getRestaurantSettings();

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
            <div><dt className="font-semibold text-stone-900">Payment option</dt><dd>{booking.paymentMethod || 'Not selected'}</dd></div>
          </dl>
          {restaurantSettings?.googleMapsUrl ? (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Restaurant location</p>
              <a href={restaurantSettings.googleMapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex font-semibold underline">Open map location</a>
            </div>
          ) : null}
          {booking.customerNote ? <p className="mt-6 rounded-2xl bg-stone-50 p-4 text-sm text-stone-600">{booking.customerNote}</p> : null}
          <BookingSlipActions
            bookingNumber={booking.bookingNumber}
            restaurantName="Pizza Vizza"
            roomName={booking.roomSnapshot.name}
            bookingDate={booking.bookingDate}
            startTime={booking.startTime}
            endTime={booking.endTime}
            guestCount={booking.guestCount}
            amount={booking.finalAmount}
            bookingStatus={booking.bookingStatus}
            paymentStatus={booking.paymentStatus}
          />
          {booking.bookingStatus !== 'CANCELLED' && booking.bookingStatus !== 'REJECTED' ? <Link href={`/menu?bookingNumber=${encodeURIComponent(booking.bookingNumber)}`} className="mt-6 inline-flex min-h-11 items-center rounded-full bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white">Order food for this reservation</Link> : null}
          {booking.paymentMethod === 'ONLINE' && booking.paymentStatus !== 'PAID' && booking.bookingStatus !== 'CANCELLED' && booking.bookingStatus !== 'REJECTED' ? <Link href={`/account/bookings/${encodeURIComponent(booking.bookingNumber)}/pay`} className="mt-3 inline-flex min-h-11 items-center rounded-full border border-amber-600 px-4 py-2.5 text-sm font-semibold text-amber-700">Pay reservation now</Link> : null}
          {canCancel ? <BookingCancelButton bookingNumber={booking.bookingNumber} /> : <p className="mt-6 text-sm text-stone-600">This reservation cannot be cancelled in its current status.</p>}
        </section>
      </div>
    </CustomerShell>
  );
}