'use client';

import { useState } from 'react';

const bookingActions = [
  { label: 'Confirm', value: 'CONFIRMED' },
  { label: 'Reject', value: 'REJECTED' },
  { label: 'Cancel', value: 'CANCELLED' },
  { label: 'Complete', value: 'COMPLETED' },
];

interface BookingActionsProps {
  bookingNumber: string;
  currentStatus: string;
}

export function BookingStatusActions({ bookingNumber, currentStatus }: BookingActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function updateStatus(status: string) {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingNumber}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to update booking');
      setMessage(`Booking status updated to ${status}`);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Failed to update booking');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">Current status: {currentStatus}</p>
      <div className="flex flex-wrap gap-3">
        {bookingActions.map((action) => (
          <button
            key={action.value}
            type="button"
            disabled={isLoading || action.value === currentStatus}
            onClick={() => updateStatus(action.value)}
            className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {action.label}
          </button>
        ))}
      </div>
      {message && <div className="text-sm text-stone-600">{message}</div>}
    </div>
  );
}
