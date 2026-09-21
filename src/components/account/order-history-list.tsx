'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { orderStatusLabel, paymentStatusLabel } from '@/src/utils/display-labels';

type OrderSummary = {
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  fulfillmentType: string;
  totalAmount: number;
  deliveryOtpCode?: string | null;
  deliveryOtpVerified?: boolean;
};

const OTP_POLL_INTERVAL_MS = 5000;

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

function hasDeliveryOtp(order: OrderSummary) {
  return order.fulfillmentType === 'DELIVERY' && Boolean(order.deliveryOtpCode) && order.deliveryOtpVerified !== true;
}

export default function OrderHistoryList({ initialOrders }: { initialOrders: OrderSummary[] }) {
  const [orders, setOrders] = useState(initialOrders);

  useEffect(() => {
    let active = true;

    async function refreshOrders() {
      try {
        const response = await fetch('/api/account/orders', { cache: 'no-store' });
        if (!response.ok) return;
        const payload = await response.json() as { data?: OrderSummary[] };
        if (active && Array.isArray(payload.data)) setOrders(payload.data);
      } catch {
        // Keep the last known order state when a background refresh is unavailable.
      }
    }

    const interval = window.setInterval(refreshOrders, OTP_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <ul className="space-y-4">
      {orders.map((order) => (
        <li key={order.orderNumber} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm text-stone-500">{order.orderNumber}</p>
              <h2 className="mt-1 text-xl font-semibold text-stone-900">{orderStatusLabel(order.orderStatus)}</h2>
              <p className="mt-2 text-sm text-stone-600">Payment: {paymentStatusLabel(order.paymentStatus)}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-lg font-semibold text-stone-900">{formatCurrency(order.totalAmount)}</p>
              <Link href={`/account/orders/${order.orderNumber}`} className="mt-3 inline-flex text-sm font-semibold text-amber-700">View details</Link>
            </div>
          </div>
          {hasDeliveryOtp(order) ? (
            <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-800">Delivery OTP</p>
                <span className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-800">Share with delivery partner</span>
              </div>
              <p className="mt-2 font-mono text-3xl font-bold tracking-[0.28em] text-stone-900">{order.deliveryOtpCode}</p>
              {!order.deliveryOtpVerified ? <p className="mt-1 text-xs text-amber-900">Keep this code ready when your order arrives.</p> : null}
            </div>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
