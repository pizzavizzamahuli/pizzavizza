'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function BookingCancelButton({ bookingNumber }: { bookingNumber: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  async function cancel() {
    if (!window.confirm('Cancel this dining reservation?')) return;
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch('/api/dining/bookings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'CANCEL', bookingNumber }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Unable to cancel booking');
      setMessage('Reservation cancelled.');
      router.refresh();
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Unable to cancel booking');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      <button type="button" onClick={cancel} disabled={loading} className="min-h-11 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">
        {loading ? 'Cancelling...' : 'Cancel reservation'}
      </button>
      {message ? <p className="mt-2 text-sm text-stone-600" role="status">{message}</p> : null}
    </div>
  );
}