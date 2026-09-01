import { getSessionUser } from '@/src/auth/session';
import { findOrderByOrderNumber } from '@/src/models/order';
import { notFound } from 'next/navigation';
import OrderDetailPaymentProof from '@/src/components/account/order-detail-payment-proof';
import { getPaymentMethodLabel } from '@/src/services/payment-service';

export default async function OrderDetailPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const user = await getSessionUser();
  if (!user) return notFound();

  const { orderNumber } = await params;
  const order = await findOrderByOrderNumber(orderNumber);
  if (!order || order.userId !== user._id!.toHexString()) return notFound();

  return (
    <div className="mx-auto max-w-3xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Order {order.orderNumber}</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-500">Status</p>
          <p className="mt-2 font-medium">{order.orderStatus}</p>
          <p className="text-sm text-stone-500 mt-4">Payment</p>
          <p className="mt-2 font-medium">{getPaymentMethodLabel(order.paymentMethod)} • {order.paymentStatus}</p>
          {order.transactionId && <p className="mt-2 text-sm text-stone-600">Transaction ID: {order.transactionId}</p>}
        </div>
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <p className="text-sm text-stone-500">Total</p>
          <p className="mt-2 text-3xl font-semibold">₹{order.totalAmount.toFixed(2)}</p>
          {order.couponCode && <p className="mt-3 text-sm text-stone-500">Coupon: {order.couponCode}</p>}
          {order.referralCode && <p className="text-sm text-stone-500">Referral: {order.referralCode}</p>}
          {order.walletAmount > 0 && <p className="mt-2 text-sm text-stone-500">Wallet used: ₹{order.walletAmount.toFixed(2)}</p>}
        </div>
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="font-medium">Items</h2>
        <ul className="mt-4 space-y-3">
          {order.items.map((it) => (
            <li key={it.productId} className="rounded-2xl border border-stone-100 bg-stone-50 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium text-stone-900">{it.name}</div>
                  {it.selectedOptions && it.selectedOptions.length > 0 && (
                    <div className="mt-2 text-sm text-stone-600">
                      {it.selectedOptions.map((option) => (
                        <div key={option.optionId}>
                          <span className="font-medium">{option.groupName}:</span> {option.optionName}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="text-right text-sm text-stone-700">
                  <div>{it.quantity} × ₹{it.unitPrice.toFixed(2)}</div>
                  <div className="font-semibold">₹{it.subtotal.toFixed(2)}</div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {order.deliveryAddress && (
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <h3 className="font-medium">Delivery address</h3>
          <div className="mt-2 space-y-1 text-sm text-stone-600">
            <div>{order.deliveryAddress.fullName}</div>
            <div>{order.deliveryAddress.mobile}</div>
            <div>{order.deliveryAddress.addressLine1}</div>
            {order.deliveryAddress.addressLine2 && <div>{order.deliveryAddress.addressLine2}</div>}
            {order.deliveryAddress.landmark && <div>{order.deliveryAddress.landmark}</div>}
            <div>{order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.postalCode}</div>
          </div>
        </div>
      )}

      {order.customerNote && (
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <h3 className="font-medium">Customer note</h3>
          <p className="mt-2 text-sm text-stone-600">{order.customerNote}</p>
        </div>
      )}

      {order.paymentMethod === 'MANUAL' && (
        <div>
          <OrderDetailPaymentProof orderNumber={order.orderNumber} paymentStatus={order.paymentStatus} paymentProofUrl={order.paymentProofUrl} />
        </div>
      )}
    </div>
  );
}
