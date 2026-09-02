import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { listBookings } from '@/src/services/dining-service';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export default async function AdminBookingsPage({ searchParams }: { searchParams?: Promise<{ date?: string; status?: string }> }) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'bookings.view')) return notFound();

  const params = searchParams ? await searchParams : {};
  const allBookings = await listBookings();
  const bookings = allBookings.filter((booking) => (!params.date || booking.bookingDate === params.date) && (!params.status || booking.bookingStatus === params.status));

  return (
    <div className="mx-auto max-w-6xl px-0 py-2 sm:p-8">
      <h1 className="text-2xl font-semibold">Bookings</h1>
      <p className="mt-2 text-sm text-stone-600">Manage dining reservations and track booking status.</p>
      <form className="mt-4 flex flex-wrap gap-3 rounded-2xl border border-stone-200 bg-white p-4" method="get">
        <label className="text-sm font-medium text-stone-700">Date<input type="date" name="date" defaultValue={params.date || ''} className="ml-2 rounded-xl border px-3 py-2 font-normal" /></label>
        <label className="text-sm font-medium text-stone-700">Status<select name="status" defaultValue={params.status || ''} className="ml-2 rounded-xl border px-3 py-2 font-normal"><option value="">All statuses</option><option value="PENDING">Pending</option><option value="CONFIRMED">Confirmed</option><option value="COMPLETED">Completed</option><option value="CANCELLED">Cancelled</option><option value="REJECTED">Rejected</option></select></label>
        <button type="submit" className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white">Apply filters</button>
      </form>
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
