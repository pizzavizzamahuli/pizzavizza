import { requireAdminAccess } from '@/src/auth/guard';
import { getUsersCollection } from '@/src/models/user';
import { listOrders } from '@/src/models/order';
import { countDiningBookings } from '@/src/models/dining-booking';
import { LogoutButton } from '@/src/components/auth/logout-button';
import Link from 'next/link';

export default async function AdminPage() {
  const user = await requireAdminAccess();
  const [orders, usersCollection, pendingBookings, confirmedBookings] = await Promise.all([
    listOrders(),
    getUsersCollection(),
    countDiningBookings({ bookingStatus: 'PENDING' }),
    countDiningBookings({ bookingStatus: 'CONFIRMED' }),
  ]);
  const customerCount = await usersCollection.countDocuments({ role: 'CUSTOMER' });
  const completedOrders = orders.filter((order) => ['DELIVERED', 'COMPLETED'].includes(order.orderStatus));
  const pendingOrders = orders.filter((order) => ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(order.orderStatus));
  const pendingPayments = orders.filter((order) => order.paymentStatus === 'PENDING' || order.paymentStatus === 'AWAITING_VERIFICATION');
  const revenue = completedOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Admin</p>
        <h1 className="mt-2 text-3xl font-semibold text-stone-900">Pizza Vizza Admin</h1>
        <p className="mt-3 text-sm text-stone-600">Welcome back, {user.name}. Live store activity is summarized below.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Orders', orders.length.toString()],
          ['Revenue', `₹${revenue.toFixed(2)}`],
          ['Pending Orders', pendingOrders.length.toString()],
          ['Pending Payments', pendingPayments.length.toString()],
          ['Dining Bookings', String(pendingBookings + confirmedBookings)],
          ['Customers', customerCount.toString()],
        ].map(([title, value]) => (
          <article key={title} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-stone-500">{title}</p>
            <p className="mt-2 text-3xl font-semibold text-stone-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Recent Orders</h2>
            <p className="text-sm text-stone-600">Latest orders from MongoDB.</p>
          </div>
          <Link href="/admin/orders" className="text-sm font-semibold text-amber-700">View all</Link>
        </div>
        <div className="mt-4 space-y-3">
          {recentOrders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">No orders yet.</p>
          ) : (
            recentOrders.map((order) => (
              <Link key={order.orderNumber} href={`/admin/orders/${order.orderNumber}`} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 p-4 transition hover:border-amber-300">
                <div>
                  <p className="font-semibold text-stone-900">{order.orderNumber}</p>
                  <p className="text-sm text-stone-600">{order.customerSnapshot.name} • {order.orderStatus}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-stone-900">₹{order.totalAmount.toFixed(2)}</p>
                  <p className="text-sm text-stone-500">{order.paymentStatus}</p>
                </div>
              </Link>
            ))
          )}
        </div>
      </section>

      <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-stone-900">Signed in as</h2>
            <p className="text-sm text-stone-600">{user.email} • {user.role}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
