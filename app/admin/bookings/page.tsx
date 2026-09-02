import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { listBookings } from '@/src/services/dining-service';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AdminBookingsPage() {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'bookings.view')) return notFound();

  const bookings = await listBookings();

  return (
    <div className="mx-auto max-w-6xl px-0 py-2 sm:p-8">
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <p className="mt-2 text-sm text-stone-600">Manage dining reservations and track booking status.</p>
      {bookings.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-stone-200 bg-white p-8 text-stone-600">No bookings available.</div>
      ) : (
        <div className="mt-6 grid gap-4">
          {bookings.map((booking) => (
            <article key={booking.bookingNumber} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-stone-500">{booking.bookingNumber}</p>
                  <h2 className="mt-1 text-lg font-semibold text-stone-900">{booking.roomSnapshot.name}</h2>
                  <p className="mt-1 text-sm text-stone-600">{booking.bookingDate} • {booking.startTime} - {booking.endTime}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-sm text-stone-500">{booking.customerSnapshot.name}</p>
                  <p className="text-sm text-stone-500">{booking.bookingStatus}</p>
                  <p className="text-sm text-stone-500">Guests: {booking.guestCount} • ₹{booking.finalAmount.toFixed(2)}</p>
                  <Link href={`/admin/bookings/${booking.bookingNumber}`} className="mt-2 inline-flex rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                    View
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
