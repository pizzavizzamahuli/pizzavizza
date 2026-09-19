import Link from 'next/link';

const statusLabel: Record<string, string> = {
  PENDING: 'Order placed',
  CONFIRMED: 'Accepted',
  PREPARING: 'Preparing',
  READY: 'Ready',
  PICKED_UP: 'Picked up',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  REJECTED: 'Rejected',
};

type OrderItem = {
  productId: string;
  name: string;
  image?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  selectedOptions?: Array<{ optionId: string; groupName: string; optionName: string; price: number }>;
};

type Order = {
  orderNumber: string;
  createdAt: Date;
  fulfillmentType: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  transactionId?: string | null;
  customerSnapshot: { name: string; mobile?: string | null; email?: string | null };
  items: OrderItem[];
  subtotal: number;
  discount: number;
  walletAmount: number;
  deliveryCharge: number;
  additionalCharges: number;
  totalAmount: number;
  paidAmount?: number;
  amountDue?: number;
  couponCode?: string | null;
  referralCode?: string | null;
  customerNote?: string | null;
  deliveryAddress?: {
    fullName: string;
    mobile: string;
    addressLine1: string;
    addressLine2?: string | null;
    landmark?: string | null;
    city: string;
    state: string;
    postalCode: string;
    googleMapsUrl?: string | null;
  } | null;
  deliveryOtpCode?: string | null;
  deliveryOtpVerified?: boolean;
};

type Settings = {
  restaurantName: string;
  logo?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  phone?: string | null;
  email?: string | null;
};

export default function OrderReceiptView({ order, settings }: { order: Order; settings: Settings }) {
  const paymentVerified = order.paymentStatus === 'PAID';
  const paymentPending = ['PENDING', 'AWAITING_VERIFICATION'].includes(order.paymentStatus) && order.paymentMethod !== 'COD';
  const paymentRejected = ['FAILED', 'REFUNDED', 'SUSPICIOUS'].includes(order.paymentStatus);
  const activeTimeline = order.fulfillmentType === 'DELIVERY'
    ? ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED']
    : ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED'];
  const currentIndex = activeTimeline.indexOf(order.orderStatus);
  const showDeliveryOtpBlock = order.fulfillmentType === 'DELIVERY' && ['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.orderStatus);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href="/account/orders" className="text-sm font-semibold text-amber-700">Back to my orders</Link>
        <Link href="/menu" className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">Continue shopping</Link>
      </div>

      <section className={`rounded-3xl border p-6 shadow-sm sm:p-8 ${paymentRejected ? 'border-rose-200 bg-rose-50' : paymentPending ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}`}>
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-2xl">{paymentRejected ? '!' : paymentPending ? '…' : '✓'}</div>
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em]">{paymentRejected ? 'Payment rejected' : paymentPending ? 'Order placed' : 'Order confirmed'}</p>
            <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{paymentRejected ? 'Payment needs attention' : paymentPending ? 'Payment verification pending' : `Thank you for ordering from ${settings.restaurantName}.`}</h1>
            <p className="mt-2 text-sm">{paymentRejected ? 'This order cannot proceed until the payment issue is resolved.' : paymentPending ? 'Your payment proof has been submitted and is currently awaiting verification.' : 'Your order is moving through the restaurant workflow.'}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-stone-500">Order number</dt>
            <dd className="font-semibold">{order.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Placed</dt>
            <dd className="font-semibold">{order.createdAt.toLocaleDateString()} {order.createdAt.toLocaleTimeString()}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Order type</dt>
            <dd className="font-semibold">{order.fulfillmentType}</dd>
          </div>
        </dl>
      </section>

      {showDeliveryOtpBlock ? (
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-lg font-semibold">Delivery verification</h2>
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-stone-700">OTP code</p>
            <p className="mt-2 font-mono text-2xl font-bold tracking-[0.3em] text-amber-900">{order.deliveryOtpCode || 'Not issued yet'}</p>
            <p className="mt-2 text-sm text-stone-600">
              Status: <span className={order.deliveryOtpVerified ? 'font-semibold text-emerald-700' : 'font-semibold text-amber-700'}>{order.deliveryOtpVerified ? 'Verified' : 'Pending delivery confirmation'}</span>
            </p>
          </div>
        </section>
      ) : null}

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold">Order items</h2>
        <div className="mt-5 space-y-3">
          {order.items.map((item) => (
            <div key={`${item.productId}-${item.name}`} className="flex items-center justify-between gap-3 rounded-2xl bg-stone-50 p-3">
              <div>
                <p className="font-medium">{item.name}</p>
                {item.selectedOptions?.length ? (
                  <p className="text-sm text-stone-500">{item.selectedOptions.map((option) => option.optionName).join(', ')}</p>
                ) : null}
              </div>
              <div className="text-right text-sm text-stone-700">
                <div>{item.quantity} × ₹{item.unitPrice.toFixed(2)}</div>
                <div className="font-semibold">₹{item.subtotal.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold">Delivery and payment</h2>
        <div className="mt-4 space-y-2 text-sm text-stone-700">
          <div className="flex items-center justify-between"><span>Subtotal</span><span>₹{order.subtotal.toFixed(2)}</span></div>
          <div className="flex items-center justify-between"><span>Discount</span><span>-₹{order.discount.toFixed(2)}</span></div>
          <div className="flex items-center justify-between"><span>Wallet</span><span>-₹{order.walletAmount.toFixed(2)}</span></div>
          <div className="flex items-center justify-between"><span>Delivery</span><span>₹{order.deliveryCharge.toFixed(2)}</span></div>
          <div className="flex items-center justify-between"><span>Additional charges</span><span>₹{order.additionalCharges.toFixed(2)}</span></div>
          <div className="flex items-center justify-between border-t border-stone-200 pt-2 text-base font-semibold text-stone-900"><span>Total</span><span>₹{order.totalAmount.toFixed(2)}</span></div>
        </div>
      </section>

      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
        <h2 className="text-xl font-semibold">Status timeline</h2>
        <div className="mt-5 flex flex-wrap gap-2">
          {activeTimeline.map((step, index) => (
            <div key={step} className={`rounded-full border px-3 py-2 text-xs font-semibold ${index <= currentIndex ? 'border-amber-500 bg-amber-50 text-amber-900' : 'border-stone-200 bg-stone-50 text-stone-500'}`}>
              {statusLabel[step] || step}
            </div>
          ))}
        </div>
      </section>

      <div className="pb-8" />
    </div>
  );
}
