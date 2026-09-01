import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { LogoutButton } from '@/src/components/auth/logout-button';
import { CustomerShell } from '@/src/app-shell';
import { listOrdersForUser } from '@/src/models/order';
import { listDiningBookingsForUser } from '@/src/models/dining-booking';
import { listAddressesForUser } from '@/src/models/address';
import { getWalletBalance } from '@/src/models/wallet';
import { createReferral, findReferralByUser } from '@/src/models/referral';

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

export default async function AccountPage() {
  const user = await getSessionUser();

  if (!user) {
    redirect('/login');
  }

  const userId = user._id?.toHexString() || user.id || '';
  const [orders, bookings, addresses, walletBalance, referral] = await Promise.all([
    listOrdersForUser(userId).catch(() => []),
    listDiningBookingsForUser(userId).catch(() => []),
    listAddressesForUser(userId).catch(() => []),
    getWalletBalance(userId).catch(() => 0),
    findReferralByUser(userId).catch(() => null),
  ]);

  const activeReferral = referral ?? (await createReferral(userId, 50).catch(() => null));
  const recentOrders = orders.slice(0, 3);
  const recentBookings = bookings.slice(0, 2);

  return (
    <CustomerShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">My account</p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-stone-900">Welcome back, {user.name}</h1>
              <p className="mt-2 text-sm text-stone-600">Manage your orders, dining reservations, saved addresses, and wallet rewards from one dashboard.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/account/change-password" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100">
                Change password
              </Link>
              <LogoutButton />
            </div>
          </div>

          <dl className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <dt className="text-sm text-stone-500">Orders</dt>
              <dd className="mt-1 text-2xl font-semibold text-stone-900">{orders.length}</dd>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <dt className="text-sm text-stone-500">Bookings</dt>
              <dd className="mt-1 text-2xl font-semibold text-stone-900">{bookings.length}</dd>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <dt className="text-sm text-stone-500">Saved addresses</dt>
              <dd className="mt-1 text-2xl font-semibold text-stone-900">{addresses.length}</dd>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <dt className="text-sm text-stone-500">Wallet balance</dt>
              <dd className="mt-1 text-2xl font-semibold text-stone-900">{formatCurrency(walletBalance)}</dd>
            </div>
          </dl>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Quick actions</h2>
                <p className="mt-1 text-sm text-stone-600">Jump to the next step in your customer journey.</p>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Link href="/menu" className="rounded-2xl border border-stone-200 bg-stone-50 p-4 transition hover:border-amber-300 hover:bg-amber-50">
                <p className="font-semibold text-stone-900">Browse menu</p>
                <p className="mt-1 text-sm text-stone-600">Order your favourites and add them to your cart.</p>
              </Link>
              <Link href="/account/orders" className="rounded-2xl border border-stone-200 bg-stone-50 p-4 transition hover:border-amber-300 hover:bg-amber-50">
                <p className="font-semibold text-stone-900">View orders</p>
                <p className="mt-1 text-sm text-stone-600">Review recent orders and payment status.</p>
              </Link>
              <Link href="/account/bookings" className="rounded-2xl border border-stone-200 bg-stone-50 p-4 transition hover:border-amber-300 hover:bg-amber-50">
                <p className="font-semibold text-stone-900">Dining reservations</p>
                <p className="mt-1 text-sm text-stone-600">Check booking status and upcoming visits.</p>
              </Link>
              <Link href="/account/wallet" className="rounded-2xl border border-stone-200 bg-stone-50 p-4 transition hover:border-amber-300 hover:bg-amber-50">
                <p className="font-semibold text-stone-900">Wallet & rewards</p>
                <p className="mt-1 text-sm text-stone-600">See your balance, referrals, and activity.</p>
              </Link>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-stone-900">Your referral code</h2>
                <p className="mt-1 text-sm text-stone-600">Share it with friends to earn credits.</p>
              </div>
              <Link href="/account/referrals" className="text-sm font-semibold text-amber-700">Manage</Link>
            </div>
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm text-stone-600">Code</p>
              <p className="mt-1 text-2xl font-semibold tracking-[0.2em] text-stone-900">{activeReferral?.code || 'Generating…'}</p>
              <p className="mt-2 text-sm text-stone-600">Reward value: {formatCurrency(activeReferral?.rewardValue || 50)}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-stone-900">Recent orders</h2>
              <Link href="/account/orders" className="text-sm font-semibold text-amber-700">View all</Link>
            </div>
            {recentOrders.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-200 p-6 text-sm text-stone-600">No orders yet. Start with a fresh pizza order from the menu.</div>
            ) : (
              <ul className="mt-6 space-y-3">
                {recentOrders.map((order) => (
                  <li key={order.orderNumber} className="flex items-center justify-between rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div>
                      <p className="font-semibold text-stone-900">{order.orderNumber}</p>
                      <p className="text-sm text-stone-600">{order.orderStatus} • {order.paymentStatus}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-stone-900">{formatCurrency(order.totalAmount)}</p>
                      <Link href={`/account/orders/${order.orderNumber}`} className="text-sm font-semibold text-amber-700">View</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-stone-900">Upcoming bookings</h2>
              <Link href="/account/bookings" className="text-sm font-semibold text-amber-700">View all</Link>
            </div>
            {recentBookings.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-200 p-6 text-sm text-stone-600">No bookings yet. Reserve a dining room for your next visit.</div>
            ) : (
              <ul className="mt-6 space-y-3">
                {recentBookings.map((booking) => (
                  <li key={booking.bookingNumber} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <p className="font-semibold text-stone-900">{booking.roomSnapshot.name}</p>
                    <p className="mt-1 text-sm text-stone-600">{booking.bookingDate} • {booking.startTime} to {booking.endTime}</p>
                    <p className="mt-2 text-sm text-stone-600">{booking.bookingStatus} • {formatCurrency(booking.finalAmount)}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
