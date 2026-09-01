'use client';

import React, { useEffect, useState } from 'react';
import PaymentStatusActions from '@/src/components/admin/payment-status-actions';

interface OrderRecord {
  id?: string;
  orderNumber: string;
  customerSnapshot: { name: string };
  paymentStatus: string;
  paymentMethod?: string | null;
  paymentProofUrl?: string | null;
  totalAmount: number;
}

export default function PaymentAdminPanel() {
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [filter, setFilter] = useState('ALL');
  const [loading, setLoading] = useState(true);

  async function loadOrders(status?: string) {
    setLoading(true);
    const query = status && status !== 'ALL' ? `?paymentStatus=${encodeURIComponent(status)}` : '';
    const res = await fetch(`/api/admin/orders${query}`);
    const json = await res.json();
    setOrders(json.data || []);
    setLoading(false);
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!mounted) return;
      await loadOrders();
    })();
    return () => {
      mounted = false;
    };
  }, []);

  function changeFilter(value: string) {
    setFilter(value);
    loadOrders(value === 'ALL' ? undefined : value);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <label className="text-sm font-medium">Filter by payment status</label>
          <select value={filter} onChange={(e) => changeFilter(e.target.value)} className="ml-2 rounded border px-3 py-2">
            <option value="ALL">All</option>
            <option value="PENDING">Pending</option>
            <option value="AWAITING_VERIFICATION">Awaiting Verification</option>
            <option value="PAID">Paid</option>
            <option value="FAILED">Failed</option>
            <option value="REFUNDED">Refunded</option>
          </select>
        </div>
        <button className="rounded bg-amber-600 px-4 py-2 text-white" onClick={() => loadOrders(filter === 'ALL' ? undefined : filter)}>
          Refresh
        </button>
      </div>

      {loading ? (
        <div>Loading payments…</div>
      ) : orders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-stone-50 p-6 text-stone-600">No payments found for this filter.</div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.orderNumber} className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
                <div>
                  <div className="font-semibold">{order.orderNumber}</div>
                  <div className="text-sm text-stone-500">{order.customerSnapshot.name}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-stone-500">{order.paymentMethod || 'COD'}</div>
                  <div className="font-semibold">{order.paymentStatus}</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm text-stone-600">
                <span>Total: ₹{order.totalAmount.toFixed(2)}</span>
                <a href={`/admin/orders/${order.orderNumber}`} className="text-amber-600">View order</a>
              </div>
              {order.paymentProofUrl ? (
                <a href={order.paymentProofUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-amber-700">
                  View payment proof
                </a>
              ) : null}
              <div className="mt-3">
                <PaymentStatusActions orderNumber={order.orderNumber} paymentStatus={order.paymentStatus} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
