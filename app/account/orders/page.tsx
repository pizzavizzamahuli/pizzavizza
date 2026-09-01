import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { listOrdersForUser } from '@/src/models/order';
import { CustomerShell } from '@/src/app-shell';

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

export default async function OrdersPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const orders = await listOrdersForUser(user._id!.toHexString());

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
      </div>
    </CustomerShell>
  );
}
