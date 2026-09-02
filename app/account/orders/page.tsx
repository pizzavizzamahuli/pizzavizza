import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { listOrdersForUser } from '@/src/models/order';
import { listDiningBookingsForUser } from '@/src/models/dining-booking';
import { CustomerShell } from '@/src/app-shell';

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const [orders, bookings] = await Promise.all([
    listOrdersForUser(user._id!.toHexString()),
    listDiningBookingsForUser(user._id!.toHexString()),
  ]);

  return (
    <CustomerShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Orders</p>
          <h1 className="mt-3 text-3xl font-semibold text-stone-900">Your order history</h1>
          <p className="mt-2 text-sm text-stone-600">Keep tabs on each order from preparation to delivery or pickup.</p>
        </section>

        {orders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-8 text-stone-600 shadow-sm">
            No orders yet. <Link href="/menu" className="font-semibold text-amber-700">Start with the menu.</Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {orders.map((order) => (
              <li key={order.orderNumber} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm text-stone-500">{order.orderNumber}</p>
                    <h2 className="mt-1 text-xl font-semibold text-stone-900">{order.orderStatus}</h2>
                    <p className="mt-2 text-sm text-stone-600">Payment: {order.paymentStatus}</p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="text-lg font-semibold text-stone-900">{formatCurrency(order.totalAmount)}</p>
                    <Link href={`/account/orders/${order.orderNumber}`} className="mt-3 inline-flex text-sm font-semibold text-amber-700">View details</Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Reservations</p>
              <h2 className="mt-2 text-2xl font-semibold text-stone-900">Your dining bookings</h2>
            </div>
            <Link href="/dining" className="text-sm font-semibold text-amber-700">Reserve a table</Link>
          </div>
          {bookings.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-6 text-sm text-stone-600">No dining reservations yet.</div>
          ) : (
            <ul className="space-y-3">
              {bookings.map((booking) => (
                <li key={booking.bookingNumber} className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="break-words text-sm text-stone-500">{booking.bookingNumber}</p>
                      <h3 className="mt-1 text-lg font-semibold text-stone-900">{booking.roomSnapshot.name}</h3>
                      <p className="mt-1 text-sm text-stone-600">{booking.bookingDate} • {booking.startTime} to {booking.endTime} • {booking.guestCount} guests</p>
                    </div>
                    <div className="text-left sm:text-right">
                      <p className="text-lg font-semibold text-stone-900">{formatCurrency(booking.finalAmount)}</p>
                      <p className="text-sm text-stone-500">{booking.bookingStatus}</p>
                      <Link href={`/account/bookings/${booking.bookingNumber}`} className="mt-2 inline-flex min-h-11 items-center text-sm font-semibold text-amber-700">View reservation</Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </CustomerShell>
  );
}
