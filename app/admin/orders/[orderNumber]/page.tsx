import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { findOrderByOrderNumber } from '@/src/models/order';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { generateDeliveryWhatsAppMessage } from '@/src/services/delivery-service';
import { notFound } from 'next/navigation';
import OrderStatusActions from '@/src/components/admin/order-status-actions';
import DeliveryShareActions from '@/src/components/admin/delivery-share-actions';
import PaymentStatusActions from '@/src/components/admin/payment-status-actions';
import DeliveryRouteMap from '@/src/components/admin/delivery-route-map';
import GoogleMapsActions from '@/src/components/admin/google-maps-actions';

export default async function AdminOrderDetail({ params }: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'orders.view')) return notFound();
  const { orderNumber } = await params;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order) return notFound();
  const settings = await getRestaurantSettings();
  const deliveryMessage = generateDeliveryWhatsAppMessage(order, settings);

  const nextStatuses = order.orderStatus === 'PENDING'
    ? ['CONFIRMED', 'CANCELLED', 'REJECTED']
    : order.orderStatus === 'CONFIRMED'
      ? ['PREPARING', 'CANCELLED']
      : order.orderStatus === 'PREPARING'
        ? ['READY', 'CANCELLED']
        : order.orderStatus === 'READY'
          ? order.fulfillmentType === 'DELIVERY'
            ? ['OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED']
            : ['DELIVERED', 'CANCELLED']
          : order.orderStatus === 'OUT_FOR_DELIVERY'
            ? ['DELIVERED']
            : order.orderStatus === 'DELIVERED'
              ? ['COMPLETED']
              : [];

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Order {order.orderNumber}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-500">Customer</p>
          <p className="mt-2 font-medium">{order.customerSnapshot.name}</p>
          <p className="text-sm text-stone-500">{order.customerSnapshot.mobile}</p>
          <p className="text-sm text-stone-500">{order.customerSnapshot.email}</p>
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-500">Payment</p>
          <p className="mt-2 font-medium">{order.paymentMethod || 'COD'}</p>
          <p className="text-sm text-stone-500">Status: {order.paymentStatus}</p>
          <p className="text-sm text-stone-500">Wallet used: ₹{order.walletAmount.toFixed(2)}</p>
          {order.couponCode ? <p className="text-sm text-stone-500">Coupon: {order.couponCode}</p> : null}
          {order.paymentProofUrl && (
            <p className="mt-3 text-sm"><a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="text-amber-600">View proof</a></p>
          )}
          <div className="mt-4">
            <PaymentStatusActions orderNumber={order.orderNumber} paymentStatus={order.paymentStatus} />
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <p className="text-sm text-stone-500">Total amount</p>
        <p className="mt-2 text-3xl font-semibold">₹{order.totalAmount.toFixed(2)}</p>
        <p className="mt-2 text-sm text-stone-500">Original subtotal: ₹{order.subtotal.toFixed(2)} • Discount: ₹{order.discount.toFixed(2)}</p>
      </div>
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium">Items</h2>
        <ul className="mt-4 space-y-2">
          {order.items.map((it) => (
            <li key={`${it.productId}-${it.selectedOptions?.map((option) => option.optionId).join('-') || 'base'}`} className="flex justify-between gap-4 rounded-2xl bg-stone-50 p-3">
              <div>
                <div>{it.name}</div>
                {it.selectedOptions?.length ? (
                  <div className="mt-1 space-y-1 text-sm text-stone-500">
                    {it.selectedOptions.map((option) => (
                      <div key={option.optionId}>{option.groupName}: {option.optionName} (+₹{option.price.toFixed(2)})</div>
                    ))}
                  </div>
                ) : null}
              </div>
              <div>{it.quantity} x ₹{it.unitPrice.toFixed(2)}</div>
            </li>
          ))}
        </ul>
      </div>
      {order.deliveryAddress && (
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <h3 className="font-medium">Delivery</h3>
          <div className="mt-2 space-y-1 text-sm text-stone-600">
            <div>{order.deliveryAddress.fullName}</div>
            <div>{order.deliveryAddress.mobile}</div>
            <div>{order.deliveryAddress.addressLine1}</div>
            {order.deliveryAddress.addressLine2 ? <div>{order.deliveryAddress.addressLine2}</div> : null}
            {order.deliveryAddress.landmark ? <div>Landmark: {order.deliveryAddress.landmark}</div> : null}
            <div>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</div>
          </div>
          <GoogleMapsActions
            storeLocation={
              typeof settings.latitude === 'number' && typeof settings.longitude === 'number'
                ? { latitude: settings.latitude, longitude: settings.longitude }
                : null
            }
            customerLocation={
              typeof order.deliveryAddress.latitude === 'number' && typeof order.deliveryAddress.longitude === 'number'
                ? { latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude }
                : null
            }
          />
          <div className="mt-4">
            <DeliveryRouteMap
              storeLocation={
                typeof settings.latitude === 'number' && typeof settings.longitude === 'number'
                  ? { latitude: settings.latitude, longitude: settings.longitude }
                  : null
              }
              customerLocation={
                typeof order.deliveryAddress.latitude === 'number' && typeof order.deliveryAddress.longitude === 'number'
                  ? { latitude: order.deliveryAddress.latitude, longitude: order.deliveryAddress.longitude }
                  : null
              }
              distanceKm={typeof order.deliveryDistance === 'number' ? order.deliveryDistance : null}
              etaMinutes={
                typeof order.deliveryDistance === 'number'
                  ? Math.max(1, Math.round((order.deliveryDistance / 18) * 60))
                  : null
              }
              label={order.deliveryAddress.addressLine1}
            />
          </div>
        </div>
      )}
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium">Delivery sharing</h2>
        <p className="mt-2 text-sm text-stone-600">Share complete order details with local delivery staff.</p>
        <div className="mt-4">
          <DeliveryShareActions message={deliveryMessage} whatsappNumber={settings.deliveryWhatsAppNumber} />
        </div>
      </div>
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium">Order status</h2>
        <p className="mt-2 font-medium">{order.orderStatus}</p>
        <div className="mt-4">
          <OrderStatusActions orderNumber={order.orderNumber} nextStatuses={nextStatuses} />
        </div>
      </div>
    </div>
  );
}
