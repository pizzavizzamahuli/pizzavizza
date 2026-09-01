'use client';

import { useState } from 'react';

type PaymentStatusActionsProps = {
  orderNumber: string;
  paymentStatus: string;
};

export default function PaymentStatusActions({ orderNumber, paymentStatus }: PaymentStatusActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function updatePaymentStatus(nextStatus: 'PAID' | 'FAILED' | 'REFUNDED') {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/payment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: nextStatus }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to update payment status');
      setMessage(`Payment marked as ${nextStatus}.`);
      window.location.reload();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update payment status');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {paymentStatus !== 'PAID' ? (
          <button type="button" disabled={isLoading} onClick={() => updatePaymentStatus('PAID')} className="rounded-full bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
            Verify paid
          </button>
        ) : null}
        {paymentStatus !== 'FAILED' ? (
          <button type="button" disabled={isLoading} onClick={() => updatePaymentStatus('FAILED')} className="rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60">
            Reject payment
          </button>
        ) : null}
        {paymentStatus === 'PAID' ? (
          <button type="button" disabled={isLoading} onClick={() => updatePaymentStatus('REFUNDED')} className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-sm font-semibold text-stone-700 disabled:opacity-60">
            Mark refunded
          </button>
        ) : null}
      </div>
      {message ? <p className="text-sm text-stone-600">{message}</p> : null}
    </div>
  );
}
