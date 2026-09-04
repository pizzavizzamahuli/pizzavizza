import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { listOrders } from '@/src/models/order';
import Link from 'next/link';

export default async function AdminOrdersPage() {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'orders.view')) {
    return (<div className="p-8">Unauthorized</div>);
  }

  const orders = await listOrders();

  return (
    <div className="mx-auto max-w-4xl p-8">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-2xl font-semibold">Orders</h1>{AuthorizationService.canAccess(user.role, 'orders.manage', user.permissions) ? <Link href="/admin/orders/counter" className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white">Create Counter Order</Link> : null}</div>
      <ul className="mt-6 space-y-3">
        {orders.map((o) => (
          <li key={o.orderNumber} className="rounded border p-3 flex justify-between">
            <div>
              <div className="font-medium">{o.orderNumber}</div>
              <div className="text-sm text-stone-500">{o.customerSnapshot.name} • {o.orderStatus}</div>
            </div>
            <div className="text-right">
              <div>₹{o.totalAmount.toFixed(2)}</div>
              <div className="mt-2"><Link href={`/admin/orders/${o.orderNumber}`} className="text-amber-600">View</Link></div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
