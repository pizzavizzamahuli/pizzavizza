'use client';

import { useEffect, useState } from 'react';

type Order = {
  orderNumber: string;
  orderStatus: string;
  fulfillmentType: string;
  customerSnapshot?: { name?: string; mobile?: string | null };
  deliveryAddress?: { addressLine1?: string; landmark?: string | null; city?: string; state?: string; latitude?: number | null; longitude?: number | null; googleMapsUrl?: string | null } | null;
  totalAmount: number;
  paymentStatus?: string;
  paymentMethod?: string | null;
  deliveryNote?: string | null;
  items?: Array<{ name: string; quantity: number; selectedOptions?: Array<{ optionName: string }> }>;
  deliveryOtpCode?: string | null;
  deliveryOtpVerified?: boolean;
};

const terminalStatuses = ['DELIVERED', 'COMPLETED', 'CANCELLED', 'REJECTED'];

export default function DeliveryDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [message, setMessage] = useState('');
  const [availability, setAvailability] = useState('AVAILABLE');
  const [otpInputs, setOtpInputs] = useState<Record<string, string>>({});

  async function load() {
    const response = await fetch('/api/account/orders', { cache: 'no-store' });
    if (response.ok) {
      const payload = await response.json();
      setOrders(payload.data || []);
    }
  }

  useEffect(() => {
    const initial = window.setTimeout(() => void load(), 0);
    const timer = window.setInterval(() => void load(), 15_000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  async function update(orderNumber: string, status: string) {
    const deliveryFailureReason = ['CANCELLED', 'NOT_DELIVERED'].includes(status)
      ? window.prompt(status === 'NOT_DELIVERED' ? 'Reason why the delivery could not be completed:' : 'Reason for delivery failure/cancellation:')
      : null;
    if (['CANCELLED', 'NOT_DELIVERED'].includes(status) && !deliveryFailureReason) return;

    const response = await fetch(`/api/admin/orders/${orderNumber}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, deliveryFailureReason }),
    });
    const data = await response.json();
    setMessage(response.ok ? `${orderNumber} updated` : data.error || 'Update failed');
    if (response.ok) await load();
  }

  async function verifyOtp(orderNumber: string) {
    const code = (otpInputs[orderNumber] || '').trim();
    if (!code) {
      setMessage('Please enter the delivery OTP.');
      return;
    }

    const response = await fetch(`/api/admin/orders/${orderNumber}/otp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    setMessage(response.ok ? data.message || `${orderNumber} OTP verified` : data.error || 'OTP verification failed');
    if (response.ok) await load();
  }

  async function resendOtp(orderNumber: string) {
    const response = await fetch(`/api/admin/orders/${orderNumber}/otp`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resend' }),
    });
    const data = await response.json();
    setMessage(response.ok ? data.message || `${orderNumber} OTP resent` : data.error || 'OTP resend failed');
    if (response.ok) await load();
  }

  async function saveAvailability(value: string) {
    setAvailability(value);
    const response = await fetch('/api/account/staff-status', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffStatus: value }),
    });
    if (!response.ok) setMessage('Availability could not be updated.');
  }

  const active = orders.filter((order) => !terminalStatuses.includes(order.orderStatus));
  const history = orders.filter((order) => terminalStatuses.includes(order.orderStatus));

  function renderOrder(order: Order) {
    const paymentText = order.paymentStatus === 'PAID'
      ? 'PAID'
      : order.paymentMethod === 'COD'
        ? `COD • Collect INR ${order.totalAmount.toFixed(2)}`
        : `PAYMENT DUE • INR ${order.totalAmount.toFixed(2)}`;
    const otpVerified = Boolean(order.deliveryOtpVerified);
    const customerPhone = order.customerSnapshot?.mobile?.replace(/\D/g, '') || '';
    const openCustomerLocation = order.deliveryAddress && typeof order.deliveryAddress.latitude === 'number' && typeof order.deliveryAddress.longitude === 'number'
      ? `https://www.google.com/maps?q=${order.deliveryAddress.latitude},${order.deliveryAddress.longitude}`
      : null;
    const navigateCustomer = order.deliveryAddress && typeof order.deliveryAddress.latitude === 'number' && typeof order.deliveryAddress.longitude === 'number'
      ? `https://www.google.com/maps/dir/?api=1&destination=${order.deliveryAddress.latitude},${order.deliveryAddress.longitude}&travelmode=driving`
      : null;

    return (
      <article key={order.orderNumber} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{order.orderNumber}</h2>
            <p className="text-sm text-stone-600">{order.customerSnapshot?.name || 'Customer'} • {order.customerSnapshot?.mobile || 'No phone'}</p>
          </div>
          <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-800">{order.orderStatus}</span>
        </div>

        {order.deliveryAddress ? (
          <p className="mt-4 text-sm text-stone-700">
            {order.deliveryAddress.addressLine1}, {order.deliveryAddress.landmark ? `${order.deliveryAddress.landmark}, ` : ''}{order.deliveryAddress.city}, {order.deliveryAddress.state}
          </p>
        ) : (
          <p className="mt-4 text-sm text-stone-500">Pickup order</p>
        )}

        <p className="mt-2 text-sm text-stone-600">
          {order.items?.map((item) => `${item.quantity} × ${item.name}${item.selectedOptions?.length ? ` (${item.selectedOptions.map((option) => option.optionName).join(', ')})` : ''}`).join(', ')}
        </p>
        <p className="mt-2 text-sm font-semibold text-stone-800">{paymentText}</p>

        {order.deliveryNote ? (
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">Note: {order.deliveryNote}</p>
        ) : null}

        {order.orderStatus === 'OUT_FOR_DELIVERY' ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-800">Delivery OTP</p>
            {otpVerified ? (
              <p className="mt-2 text-sm font-semibold text-emerald-700">Verified successfully</p>
            ) : (
              <>
                <p className="mt-2 text-sm text-amber-900">OTP is hidden from staff. Enter the customer-provided code here.</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <input
                    value={otpInputs[order.orderNumber] || ''}
                    onChange={(event) => setOtpInputs((current) => ({ ...current, [order.orderNumber]: event.target.value }))}
                    placeholder="Enter OTP"
                    className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm"
                  />
                  <button onClick={() => void verifyOtp(order.orderNumber)} className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white">
                    Verify
                  </button>
                  <button onClick={() => void resendOtp(order.orderNumber)} className="min-h-11 rounded-xl border border-amber-300 bg-white px-4 text-sm font-bold text-amber-800">
                    Resend OTP
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          {order.orderStatus === 'READY' ? (
            <button onClick={() => void update(order.orderNumber, 'PICKED_UP')} className="min-h-11 rounded-xl bg-amber-600 px-4 text-sm font-bold text-white">
              Picked up
            </button>
          ) : null}
          {order.orderStatus === 'PICKED_UP' ? (
            <button onClick={() => void update(order.orderNumber, 'OUT_FOR_DELIVERY')} className="min-h-11 rounded-xl bg-sky-600 px-4 text-sm font-bold text-white">
              Start delivery
            </button>
          ) : null}
          {order.orderStatus === 'OUT_FOR_DELIVERY' ? (
            <>
              <button onClick={() => void update(order.orderNumber, 'DELIVERED')} className="min-h-11 rounded-xl bg-emerald-600 px-4 text-sm font-bold text-white" disabled={!otpVerified}>
                Mark delivered
              </button>
              <button onClick={() => void update(order.orderNumber, 'NOT_DELIVERED')} className="min-h-11 rounded-xl border border-rose-300 bg-rose-50 px-4 text-sm font-bold text-rose-700">
                Not delivered
              </button>
            </>
          ) : null}
          {customerPhone ? (
            <a href={`tel:+${customerPhone}`} className="flex min-h-11 items-center justify-center rounded-xl border border-stone-300 px-4 text-center text-sm font-bold text-stone-700">
              Call
            </a>
          ) : null}
          {navigateCustomer ? (
            <a href={navigateCustomer} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center rounded-xl border border-sky-300 bg-sky-50 px-4 text-center text-sm font-bold text-sky-700">
              Navigate customer
            </a>
          ) : openCustomerLocation ? (
            <a href={openCustomerLocation} target="_blank" rel="noreferrer" className="flex min-h-11 items-center justify-center rounded-xl border border-sky-300 bg-sky-50 px-4 text-center text-sm font-bold text-sky-700">
              Open customer map
            </a>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Delivery staff</p>
          <h1 className="mt-1 text-3xl font-semibold">My deliveries</h1>
          <p className="mt-2 text-sm text-stone-600">Only orders assigned to your account are shown.</p>
        </div>
        <label className="text-sm font-semibold text-stone-700">
          Availability
          <select
            value={availability}
            onChange={(event) => void saveAvailability(event.target.value)}
            className="ml-2 rounded-xl border px-3 py-2"
          >
            <option>AVAILABLE</option>
            <option>BUSY</option>
            <option>ON_DELIVERY</option>
            <option>OFFLINE</option>
          </select>
        </label>
      </header>

      {message ? <p className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p> : null}

      <section>
        <h2 className="mb-3 text-lg font-semibold">Active deliveries</h2>
        <div className="grid gap-4">{active.map(renderOrder)}</div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Delivery history</h2>
        <div className="grid gap-4">{history.map(renderOrder)}</div>
      </section>
    </div>
  );
}
