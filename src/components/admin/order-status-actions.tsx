'use client';

import { useState } from 'react';

interface Props {
  orderNumber: string;
  nextStatuses: string[];
}

export default function OrderStatusActions({ orderNumber, nextStatuses }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function updateStatus(status: string) {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/orders/${encodeURIComponent(orderNumber)}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to update order status');
      setMessage(`Order status updated to ${status}`);
      window.location.reload();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update order status');
    } finally {
      setIsLoading(false);
    }
  }

  if (nextStatuses.length === 0) {
    return <p className="text-sm text-stone-500">No further status updates are available.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">Available next status updates</p>
      <div className="flex flex-wrap gap-3">
        {nextStatuses.map((status) => (
          <button
            key={status}
            type="button"
            disabled={isLoading}
            onClick={() => updateStatus(status)}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {status}
          </button>
        ))}
      </div>
      {message && <div className="text-sm text-stone-600">{message}</div>}
    </div>
  );
}
