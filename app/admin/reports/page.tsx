import { requireAdminAccess } from '@/src/auth/guard';
import { listOrders } from '@/src/models/order';
import { listDiningBookings } from '@/src/models/dining-booking';

export default async function AdminReportsPage() {
  await requireAdminAccess();
  const [orders, bookings] = await Promise.all([listOrders(), listDiningBookings()]);
  const paidOrders = orders.filter((order) => order.paymentStatus === 'PAID' || order.paymentMethod === 'COD');
  const deliveredOrders = orders.filter((order) => ['DELIVERED', 'COMPLETED'].includes(order.orderStatus));
  const revenue = deliveredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
  const pendingPayments = orders.filter((order) => order.paymentStatus === 'PENDING' || order.paymentStatus === 'AWAITING_VERIFICATION');
  const manualPayments = orders.filter((order) => order.paymentMethod === 'MANUAL');
  const activeBookings = bookings.filter((booking) => ['PENDING', 'CONFIRMED'].includes(booking.bookingStatus));

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="text-sm text-stone-600">Operational summaries generated from live order and dining data.</p>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Total orders', orders.length],
          ['Delivered/completed', deliveredOrders.length],
          ['Paid/COD orders', paidOrders.length],
          ['Pending payments', pendingPayments.length],
          ['Manual payments', manualPayments.length],
          ['Active bookings', activeBookings.length],
        ].map(([label, value]) => (
          <article key={label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-stone-500">{label}</p>
            <p className="mt-2 text-3xl font-semibold text-stone-900">{value}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-stone-900">Revenue</h2>
        <p className="mt-2 text-3xl font-semibold text-stone-900">₹{revenue.toFixed(2)}</p>
        <p className="mt-2 text-sm text-stone-600">Calculated from delivered and completed orders.</p>
      </section>
    </div>
  );
}
