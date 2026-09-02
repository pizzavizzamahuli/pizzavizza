import { notFound, redirect } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { getBookingForUser } from '@/src/services/dining-service';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import ReservationPaymentForm from '@/src/components/dining/reservation-payment-form';

export default async function ReservationPaymentPage({ params }: { params: Promise<{ bookingNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const { bookingNumber } = await params;
  const booking = await getBookingForUser(user._id!.toHexString(), bookingNumber);
  if (!booking) notFound();
  if (booking.paymentStatus === 'PAID') redirect(`/account/bookings/${encodeURIComponent(bookingNumber)}`);

  const settings = await getRestaurantSettings();
  return (
    <main className="mx-auto max-w-xl px-5 py-8 sm:px-8">
      <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Reservation payment</p>
      <h1 className="mt-2 text-2xl font-semibold text-stone-900">Pay for {booking.bookingNumber}</h1>
      <p className="mt-2 text-sm text-stone-600">{booking.roomSnapshot.name} on {booking.bookingDate}, {booking.startTime} to {booking.endTime}</p>
      <section className="mt-6 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <ReservationPaymentForm
          bookingNumber={booking.bookingNumber}
          amount={booking.finalAmount}
          razorpayEnabled={settings.onlinePaymentEnabled}
          manualPaymentEnabled={settings.manualPaymentEnabled}
          manualPaymentUpiId={settings.manualPaymentUpiId}
          manualPaymentQrUrl={settings.manualPaymentQrUrl}
          manualPaymentBankDetails={settings.manualPaymentBankDetails}
        />
      </section>
    </main>
  );
}
