'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ReceiptActions from '@/src/components/account/receipt-actions';

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
  listPrice?: number;
  productDiscount?: number;
  subtotal: number;
  selectedOptions?: Array<{ optionId: string; groupName: string; optionName: string; price: number }>;
};

type Order = {
  userId?: string;
  orderNumber: string;
  createdAt: Date | string;
  fulfillmentType: string;
  orderStatus: string;
  paymentStatus: string;
  paymentMethod?: string | null;
  transactionId?: string | null;
  customerSnapshot: { userId?: string; name: string; mobile?: string | null; email?: string | null };
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
  complaint?: {
    category: string;
    issueDescription: string;
    submittedAt: Date | string;
    submittedByUserId: string;
  } | null;
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
  whatsappSupportNumber?: string | null;
};

const complaintCategories = [
  'Missing food',
  'Food quality',
  'Late delivery',
  'Wrong order',
  'Cold food',
  'Damaged packaging',
  'Other',
];

function normalizeWhatsAppNumber(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
}

export default function OrderReceiptView({ order, settings }: { order: Order; settings: Settings }) {
  const paymentVerified = order.paymentStatus === 'PAID';
  const paymentPending = ['PENDING', 'AWAITING_VERIFICATION'].includes(order.paymentStatus) && order.paymentMethod !== 'COD';
  const paymentRejected = ['FAILED', 'REFUNDED', 'SUSPICIOUS'].includes(order.paymentStatus);
  const activeTimeline = order.fulfillmentType === 'DELIVERY'
    ? ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'PICKED_UP', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED']
    : ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'COMPLETED'];
  const currentIndex = activeTimeline.indexOf(order.orderStatus);
  const showDeliveryOtpBlock = order.fulfillmentType === 'DELIVERY' && ['OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED'].includes(order.orderStatus);
  const complaintWindowMs = 10 * 60 * 1000;
  const completedAtValue = useMemo(() => {
    const completedEntry = (order as { statusHistory?: Array<{ newStatus: string; createdAt?: string | Date }> } | undefined)?.statusHistory?.find((entry) => entry.newStatus === 'COMPLETED');
    const source = completedEntry?.createdAt || order.createdAt || new Date();
    return new Date(source).getTime();
  }, [order]);
  const complaintWindowOpen = order.orderStatus === 'COMPLETED' && Date.now() - completedAtValue <= complaintWindowMs;
  const [category, setCategory] = useState('Missing food');
  const [issueDescription, setIssueDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const complaintSubmitted = !!order.complaint;
  const complaintMessage = useMemo(() => {
    const supportNumber = normalizeWhatsAppNumber(settings.whatsappSupportNumber || settings.phone || null);
    const complaintText = [
      'Pizza Vizza Complaint',
      `Order: ${order.orderNumber}`,
      `Complaint: ${order.complaint?.category || category}`,
      `Issue: ${order.complaint?.issueDescription || issueDescription || 'No description provided'}`,
      `Delivery number: ${order.deliveryAddress?.mobile || order.customerSnapshot.mobile || 'N/A'}`,
      `Consumer user ID: ${order.customerSnapshot.userId || order.userId || 'N/A'}`,
    ].join('\n');
    if (!supportNumber) return complaintText;
    return `https://wa.me/${supportNumber}?text=${encodeURIComponent(complaintText)}`;
  }, [category, issueDescription, order, settings.phone, settings.whatsappSupportNumber]);

  const receiptAddress = order.deliveryAddress ? {
    addressLine1: order.deliveryAddress.addressLine1,
    addressLine2: order.deliveryAddress.addressLine2,
    landmark: order.deliveryAddress.landmark,
    city: order.deliveryAddress.city,
    state: order.deliveryAddress.state,
    postalCode: order.deliveryAddress.postalCode,
  } : null;

  async function submitComplaint(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!issueDescription.trim()) {
      setSubmissionState({ type: 'error', message: 'Please describe the issue before sending the complaint.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmissionState(null);
      const response = await fetch(`/api/account/orders/${order.orderNumber}/complaint`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, issueDescription: issueDescription.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Unable to submit complaint.');
      setSubmissionState({ type: 'success', message: 'Complaint submitted successfully.' });
      window.location.reload();
    } catch (error) {
      setSubmissionState({ type: 'error', message: error instanceof Error ? error.message : 'Unable to submit complaint.' });
    } finally {
      setIsSubmitting(false);
    }
  }

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
            <dd className="font-semibold">{new Date(order.createdAt).toLocaleDateString()} {new Date(order.createdAt).toLocaleTimeString()}</dd>
          </div>
          <div>
            <dt className="text-stone-500">Order type</dt>
            <dd className="font-semibold">{order.fulfillmentType}</dd>
          </div>
        </dl>
      </section>

      <ReceiptActions data={{
        orderNumber: order.orderNumber,
        createdAt: new Date(order.createdAt).toISOString(),
        fulfillmentType: order.fulfillmentType,
        customerName: order.customerSnapshot.name,
        customerMobile: order.customerSnapshot.mobile,
        customerEmail: order.customerSnapshot.email,
        items: order.items,
        subtotal: order.subtotal,
        discount: order.discount,
        walletAmount: order.walletAmount,
        deliveryCharge: order.deliveryCharge,
        additionalCharges: order.additionalCharges,
        totalAmount: order.totalAmount,
        paidAmount: order.paidAmount ?? 0,
        amountDue: order.amountDue ?? Math.max(0, order.totalAmount - (order.paidAmount ?? 0)),
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        address: receiptAddress,
        restaurantName: settings.restaurantName,
        restaurantLogo: settings.logo,
        restaurantAddress: [settings.addressLine1, settings.city, settings.state, settings.postalCode].filter(Boolean).join(', '),
        restaurantPhone: settings.phone,
        restaurantEmail: settings.email,
      }} />

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

      {order.orderStatus === 'COMPLETED' && !complaintSubmitted && complaintWindowOpen ? (
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold">Submit a complaint</h2>
          <form onSubmit={submitComplaint} className="mt-4 space-y-4">
            <label className="block text-sm font-medium text-stone-700">
              Complaint category
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm">
                {complaintCategories.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Issue description
              <textarea value={issueDescription} onChange={(event) => setIssueDescription(event.target.value)} rows={5} maxLength={800} placeholder="Describe what happened with your order." className="mt-2 w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm" />
            </label>
            {submissionState ? (
              <p className={submissionState.type === 'success' ? 'text-sm text-emerald-700' : 'text-sm text-rose-700'}>{submissionState.message}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit" disabled={isSubmitting} className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                {isSubmitting ? 'Sending...' : 'Send complaint'}
              </button>
              <a href={complaintMessage} target="_blank" rel="noreferrer" className="rounded-full border border-emerald-600 bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
                Share on WhatsApp
              </a>
            </div>
          </form>
        </section>
      ) : complaintSubmitted ? (
        <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className="text-xl font-semibold">Complaint status</h2>
          <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            Complaint submitted on {new Date(order.complaint!.submittedAt).toLocaleString()} for {order.complaint!.category}.
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
              <div className="min-w-32 text-right text-sm text-stone-700">
                {item.listPrice != null ? <div>Price: ₹{item.listPrice.toFixed(2)}</div> : null}
                {item.productDiscount ? <div className="text-emerald-700">Discount: -₹{item.productDiscount.toFixed(2)}</div> : null}
                {item.selectedOptions?.map((option) => <div key={option.optionId} className={option.price >= 0 ? 'text-stone-500' : 'text-rose-600'}>{option.optionName}: {option.price >= 0 ? '+' : '-'}₹{Math.abs(option.price).toFixed(2)}</div>)}
                <div>{item.quantity} × ₹{item.unitPrice.toFixed(2)}</div>
                <div className="font-semibold text-stone-900">₹{item.subtotal.toFixed(2)}</div>
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
