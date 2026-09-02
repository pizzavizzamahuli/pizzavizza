import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { listDiningBookingsForUser } from '@/src/models/dining-booking';
import { CustomerShell } from '@/src/app-shell';

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

export default async function AccountBookingsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const bookings = await listDiningBookingsForUser(user._id!.toHexString());

  return (
    <CustomerShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Bookings</p>
          <h1 className="mt-3 text-3xl font-semibold text-stone-900">Your dining reservations</h1>
          <p className="mt-2 text-sm text-stone-600">Review upcoming and past bookings for your account.</p>
        </section>

        {bookings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-8 text-stone-600 shadow-sm">
            No dining bookings yet. <Link href="/dining" className="font-semibold text-amber-700">Book a room now.</Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {bookings.map((booking) => (
              <li key={booking.bookingNumber} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-sm text-stone-500">Booking {booking.bookingNumber}</p>
                    <h2 className="mt-1 text-xl font-semibold text-stone-900">{booking.roomSnapshot.name}</h2>
                    <p className="mt-2 text-sm text-stone-600">{booking.bookingDate} • {booking.startTime} to {booking.endTime}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-sm text-stone-500">{booking.bookingStatus}</p>
                    <p className="mt-2 text-lg font-semibold text-stone-900">{formatCurrency(booking.finalAmount)}</p>
                    <p className="mt-1 text-sm text-stone-500">Payment: {booking.paymentStatus}</p>
                    <Link href={`/account/bookings/${booking.bookingNumber}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-amber-700">View details</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </CustomerShell>
  );
}
