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
  currentPaymentStatus?: string;
  currentPaymentMethod?: string | null;
}

export function BookingStatusActions({ bookingNumber, currentStatus, currentPaymentStatus, currentPaymentMethod }: BookingActionsProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [extendMinutes, setExtendMinutes] = useState('30');

  async function updateStatus(status: string) {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingNumber}`, {
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

  async function updatePaymentStatus(nextPaymentStatus: string) {
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: nextPaymentStatus }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to update payment status');
      setMessage(`Payment status updated to ${nextPaymentStatus}`);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Failed to update payment status');
    } finally {
      setIsLoading(false);
    }
  }

  async function extendBookingTime() {
    const minutes = Number(extendMinutes);
    if (!Number.isFinite(minutes) || minutes <= 0) {
      setMessage('Please choose a valid extension duration.');
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/bookings/${bookingNumber}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendMinutes: minutes }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to extend booking time');
      setMessage(`Booking time extended by ${minutes} minutes.`);
    } catch (error: unknown) {
      setMessage(error instanceof Error ? error.message : 'Failed to extend booking time');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-600">Current status: {currentStatus}</p>
      <p className="text-sm text-stone-600">Payment status: {currentPaymentStatus || 'Not set'} • Method: {currentPaymentMethod || 'Not selected'}</p>
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

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm font-semibold text-stone-900">Manage payment</p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" onClick={() => updatePaymentStatus('PAID')} className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Payment Received</button>
          <button type="button" onClick={() => updatePaymentStatus('PENDING')} className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-700">Payment Not Received</button>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm font-semibold text-stone-900">Extend booking time</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <select value={extendMinutes} onChange={(e) => setExtendMinutes(e.target.value)} className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm">
            <option value="30">30 minutes</option>
            <option value="60">60 minutes</option>
            <option value="90">90 minutes</option>
            <option value="120">120 minutes</option>
          </select>
          <button type="button" onClick={extendBookingTime} className="rounded-full bg-amber-600 px-4 py-2 text-sm font-medium text-white">Extend time</button>
        </div>
      </div>

      {message && <div className="text-sm text-stone-600">{message}</div>}
    </div>
  );
}
