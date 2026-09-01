'use client';

import { useState } from 'react';

export function DiningRoomForm(): React.ReactElement {
  const [form, setForm] = useState({
    roomType: 'Private Dining',
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    images: '',
    capacityMin: '1',
    capacityMax: '4',
    roomCount: '1',
    seatsPerRoom: '4',
    pricingType: 'PER_HOUR',
    price: '600',
    bookingDurationMinutes: '60',
    availableTimeSlots: '18:00,19:00,20:00',
    amenities: 'Private seating,Live music',
    isActive: true,
    isBookable: true,
    displayOrder: '0',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function updateField(key: keyof typeof form, value: string | boolean) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function parseCommaSeparated(value: string) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload = {
        roomType: form.roomType,
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        shortDescription: form.shortDescription || undefined,
        images: parseCommaSeparated(form.images),
        capacityMin: Number(form.capacityMin),
        capacityMax: Number(form.capacityMax),
        roomCount: Number(form.roomCount),
        seatsPerRoom: Number(form.seatsPerRoom),
        pricingType: form.pricingType,
        price: Number(form.price),
        bookingDurationMinutes: Number(form.bookingDurationMinutes),
        availableTimeSlots: parseCommaSeparated(form.availableTimeSlots),
        amenities: parseCommaSeparated(form.amenities),
        isActive: form.isActive,
        isBookable: form.isBookable,
        displayOrder: Number(form.displayOrder),
      };

      const response = await fetch('/api/admin/dining/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to create dining room');
      setMessage('Dining room created successfully');
      setForm({
        roomType: 'Private Dining',
        name: '',
        slug: '',
        description: '',
        shortDescription: '',
        images: '',
        capacityMin: '1',
        capacityMax: '4',
        roomCount: '1',
        seatsPerRoom: '4',
        pricingType: 'PER_HOUR',
        price: '600',
        bookingDurationMinutes: '60',
        availableTimeSlots: '18:00,19:00,20:00',
        amenities: 'Private seating,Live music',
        isActive: true,
        isBookable: true,
        displayOrder: '0',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessage(msg || 'Error creating dining room');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Name
          <input
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </label>

        <label className="block text-sm">
          Slug
          <input
            value={form.slug}
            onChange={(e) => updateField('slug', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Room Type
          <input
            value={form.roomType}
            onChange={(e) => updateField('roomType', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            placeholder="Private Dining"
            required
          />
        </label>

        <label className="block text-sm">
          Room Count
          <input
            type="number"
            min="1"
            value={form.roomCount}
            onChange={(e) => updateField('roomCount', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Seats per Room
          <input
            type="number"
            min="1"
            value={form.seatsPerRoom}
            onChange={(e) => updateField('seatsPerRoom', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </label>

        <label className="block text-sm">
          Duration (minutes)
          <input
            type="number"
            min="15"
            value={form.bookingDurationMinutes}
            onChange={(e) => updateField('bookingDurationMinutes', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Price per unit
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => updateField('price', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </label>

        <label className="block text-sm">
          Pricing Type
          <select
            value={form.pricingType}
            onChange={(e) => updateField('pricingType', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          >
            <option value="FIXED">Fixed</option>
            <option value="PER_HOUR">Per Hour</option>
            <option value="PER_BOOKING">Per Booking</option>
          </select>
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Capacity Min
          <input
            type="number"
            min="1"
            value={form.capacityMin}
            onChange={(e) => updateField('capacityMin', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </label>

        <label className="block text-sm">
          Capacity Max
          <input
            type="number"
            min="1"
            value={form.capacityMax}
            onChange={(e) => updateField('capacityMax', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
            required
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          Display Order
          <input
            type="number"
            value={form.displayOrder}
            onChange={(e) => updateField('displayOrder', e.target.value)}
            className="mt-1 w-full rounded border px-3 py-2"
          />
        </label>

        <div className="flex items-end">
          <p className="text-xs text-stone-500">Hour-based pricing multiply with duration. Room count increases total charge automatically.</p>
        </div>
      </div>

      <label className="block text-sm">
        Available Time Slots
        <input
          value={form.availableTimeSlots}
          onChange={(e) => updateField('availableTimeSlots', e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="18:00,19:00,20:00"
        />
      </label>

      <label className="block text-sm">
        Amenities
        <input
          value={form.amenities}
          onChange={(e) => updateField('amenities', e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          placeholder="Private seating,Live music"
        />
      </label>

      <label className="block text-sm">
        Description
        <textarea
          value={form.description}
          onChange={(e) => updateField('description', e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          rows={3}
        />
      </label>

      <label className="block text-sm">
        Short Description
        <textarea
          value={form.shortDescription}
          onChange={(e) => updateField('shortDescription', e.target.value)}
          className="mt-1 w-full rounded border px-3 py-2"
          rows={2}
        />
      </label>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => updateField('isActive', e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
        />
        Active
      </label>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.isBookable}
          onChange={(e) => updateField('isBookable', e.target.checked)}
          className="h-4 w-4 rounded border-stone-300 text-amber-600 focus:ring-amber-500"
        />
        Bookable
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-70"
        >
          {isSubmitting ? 'Creating...' : 'Create Dining Room'}
        </button>
        {message ? <p className="text-sm text-stone-600">{message}</p> : null}
      </div>
    </form>
  );
}

export default DiningRoomForm;
