import { requireAdminAccess } from '@/src/auth/guard';
import { listOrders } from '@/src/models/order';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { generateDeliveryWhatsAppMessage } from '@/src/services/delivery-service';
import DeliveryShareActions from '@/src/components/admin/delivery-share-actions';
import Link from 'next/link';

export default async function AdminDeliveryPage() {
  await requireAdminAccess();
  const [orders, settings] = await Promise.all([listOrders(), getRestaurantSettings()]);
  const activeOrders = orders.filter((order) =>
    ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(order.orderStatus),
  );

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Delivery</h1>
      <p className="text-sm text-stone-600">Active delivery and pickup orders with shareable staff instructions.</p>
      {activeOrders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-6 text-stone-600">
          No active delivery or pickup orders right now.
        </div>
      ) : (
        <div className="space-y-4">
          {activeOrders.map((order) => (
            <article key={order.orderNumber} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <Link href={`/admin/orders/${order.orderNumber}`} className="text-lg font-semibold text-stone-900">
                    {order.orderNumber}
                  </Link>
                  <p className="mt-1 text-sm text-stone-600">{order.customerSnapshot.name} • {order.customerSnapshot.mobile || 'No mobile'}</p>
                  <p className="mt-1 text-sm text-stone-500">{order.fulfillmentType} • {order.orderStatus} • {order.paymentStatus}</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-stone-900">₹{order.totalAmount.toFixed(2)}</p>
                  <p className="text-sm text-stone-500">{order.paymentMethod || 'COD'}</p>
                </div>
              </div>

              {order.deliveryAddress ? (
                <div className="mt-4 rounded-2xl bg-stone-50 p-4 text-sm text-stone-700">
                  <p>{order.deliveryAddress.addressLine1}</p>
                  {order.deliveryAddress.addressLine2 ? <p>{order.deliveryAddress.addressLine2}</p> : null}
                  <p>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</p>
                  {order.deliveryAddress.googleMapsUrl ? <a href={order.deliveryAddress.googleMapsUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block font-semibold text-amber-700">Open map</a> : null}
                </div>
              ) : null}

              <div className="mt-4">
                <DeliveryShareActions message={generateDeliveryWhatsAppMessage(order, settings)} whatsappNumber={settings.deliveryWhatsAppNumber} />
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
