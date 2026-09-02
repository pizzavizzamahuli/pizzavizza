'use client';

import { useEffect, useState } from 'react';

interface BookingFormProps {
  roomId: string;
  roomName: string;
  availableTimeSlots: string[];
  price: number;
  capacityMin: number;
  capacityMax: number;
  roomCount: number;
  seatsPerRoom: number;
  pricingType: 'FIXED' | 'PER_HOUR' | 'PER_BOOKING';
  bookingDurationMinutes: number;
}

type BookingFormState = {
  bookingDate: string;
  startTime: string;
  guestCount: number;
  roomCount: number;
  durationMinutes: number;
  customerNote: string;
  statusMessage: string;
  errorMessage: string;
  isSubmitting: boolean;
};

export function DiningBookingForm({
  roomId,
  roomName,
  availableTimeSlots,
  price,
  capacityMin,
  capacityMax,
  roomCount,
  pricingType,
  bookingDurationMinutes,
}: BookingFormProps) {
  const [form, setForm] = useState<BookingFormState>({
    bookingDate: '',
    startTime: availableTimeSlots[0] || '',
    guestCount: capacityMin,
    roomCount: Math.max(1, roomCount),
    durationMinutes: bookingDurationMinutes,
    customerNote: '',
    statusMessage: '',
    errorMessage: '',
    isSubmitting: false,
  });
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState(availableTimeSlots);
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  useEffect(() => {
    setAvailableSlots(availableTimeSlots);
    if (availableTimeSlots.length && !availableTimeSlots.includes(form.startTime)) {
      setForm((current) => ({ ...current, startTime: availableTimeSlots[0] }));
    }
  }, [availableTimeSlots, form.startTime]);

  useEffect(() => {
    if (!form.bookingDate) return;
    const controller = new AbortController();
    setIsCheckingAvailability(true);
    fetch(`/api/dining/availability?roomId=${encodeURIComponent(roomId)}&date=${encodeURIComponent(form.bookingDate)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((json) => {
        if (!json.success) throw new Error(json.error || 'Unable to check availability');
        setAvailableSlots(json.data || []);
        setForm((current) => ({ ...current, startTime: (json.data || []).includes(current.startTime) ? current.startTime : (json.data || [])[0] || '' }));
      })
      .catch((error: unknown) => { if (error instanceof Error && error.name !== 'AbortError') setForm((current) => ({ ...current, errorMessage: error.message })); })
      .finally(() => setIsCheckingAvailability(false));
    return () => controller.abort();
  }, [form.bookingDate, roomId]);

  function updateField<K extends keyof BookingFormState>(field: K, value: BookingFormState[K]) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  const estimatedPrice = (() => {
    const base = Number(price) || 0;
    const durationHours = Math.max(1, form.durationMinutes / 60);
    const totalRooms = Math.max(1, form.roomCount || 1);

    if (pricingType === 'PER_HOUR') {
      return base * durationHours * totalRooms;
    }

    return base * totalRooms;
  })();

  async function submitBooking(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setForm((current) => ({ ...current, isSubmitting: true, errorMessage: '', statusMessage: '' }));

    try {
      const requestKey = idempotencyKey || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`);
      setIdempotencyKey(requestKey);
      const response = await fetch('/api/dining/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          bookingDate: form.bookingDate,
          startTime: form.startTime,
          guestCount: form.guestCount,
          roomCount: form.roomCount,
          durationMinutes: form.durationMinutes,
          customerNote: form.customerNote,
          idempotencyKey: requestKey,
        }),
      });

      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || 'Unable to create booking');
      }

      setForm((current) => ({
        ...current,
        statusMessage: `Booking created: ${json.data.bookingNumber}`,
        errorMessage: '',
        isSubmitting: false,
      }));
      setIdempotencyKey(null);
    } catch (error: unknown) {
      setForm((current) => ({
        ...current,
        errorMessage: error instanceof Error ? error.message : 'Booking failed',
        isSubmitting: false,
      }));
    }
  }

  return (
    <form onSubmit={submitBooking} className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Book {roomName}</h2>
      </div>
      <div>
        <label className="block text-sm font-medium text-stone-700">Booking date</label>
        <input
          type="date"
          value={form.bookingDate}
          onChange={(e) => updateField('bookingDate', e.target.value)}
          required
          className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Time slot</label>
        <select
          value={form.startTime}
          onChange={(e) => updateField('startTime', e.target.value)}
          required
          className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
        >
          {availableSlots.map((slot) => (
            <option key={slot} value={slot}>{slot}</option>
          ))}
        </select>
        {form.bookingDate && isCheckingAvailability ? <p className="mt-2 text-xs text-stone-500">Checking live availability...</p> : null}
        {form.bookingDate && !isCheckingAvailability && availableSlots.length === 0 ? <p className="mt-2 text-sm text-amber-700">No available time slots for this date.</p> : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-stone-700">Guest count</label>
          <input
            type="number"
            value={form.guestCount}
            min={capacityMin}
            max={capacityMax}
            onChange={(e) => updateField('guestCount', Number(e.target.value))}
            required
            className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700">Rooms needed</label>
          <input
            type="number"
            value={form.roomCount}
            min={1}
            max={Math.max(1, roomCount)}
            onChange={(e) => updateField('roomCount', Number(e.target.value))}
            required
            className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Booking duration</label>
        <input
          type="range"
          min={60}
          max={360}
          step={30}
          value={form.durationMinutes}
          onChange={(e) => updateField('durationMinutes', Number(e.target.value))}
          className="mt-3 w-full accent-amber-600"
        />
        <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
          <span>1 hour</span>
          <span className="font-semibold text-stone-700">{form.durationMinutes / 60} hr</span>
          <span>6 hours</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-stone-700">Special request</label>
        <textarea
          value={form.customerNote}
          onChange={(e) => updateField('customerNote', e.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2"
        />
      </div>

      <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4 text-sm text-stone-600">
        <div className="flex items-center justify-between gap-3">
          <span>Price estimate</span>
          <span className="text-base font-semibold text-stone-900">₹{estimatedPrice.toFixed(2)}</span>
        </div>
        <div className="mt-2 text-xs text-stone-500">
          {pricingType === 'PER_HOUR' ? `${form.durationMinutes / 60} hours • ${form.roomCount} room(s)` : `${form.roomCount} room(s) • ${roomName}`}
        </div>
      </div>

      <div className="space-y-2">
        <button
          type="submit"
          disabled={form.isSubmitting}
          className="inline-flex w-full justify-center rounded-full bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {form.isSubmitting ? 'Booking…' : 'Confirm booking'}
        </button>
        {form.statusMessage && <p className="text-sm text-emerald-700">{form.statusMessage}</p>}
        {form.errorMessage && <p className="text-sm text-red-600">{form.errorMessage}</p>}
      </div>
    </form>
  );
}
