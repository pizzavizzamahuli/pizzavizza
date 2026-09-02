'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { DiningRoomDocument } from '@/src/models/dining-room';

export type AdminDiningRoom = Omit<DiningRoomDocument, '_id' | 'createdAt' | 'updatedAt'> & {
  _id?: string;
  createdAt: string;
  updatedAt: string;
};

export function DiningRoomForm({ editingRoom, onSaved, onCancel }: { editingRoom?: AdminDiningRoom | null; onSaved?: (room: AdminDiningRoom) => void; onCancel?: () => void }): React.ReactElement {
  const emptyForm = () => ({
    roomType: 'Private Dining',
    name: '',
    slug: '',
    description: '',
    shortDescription: '',
    images: '',
    capacityMin: '1',
    capacityMax: '4',
    roomCount: '1',
    maxRoomsPerCustomer: '1',
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
  const formFromRoom = (room?: AdminDiningRoom | null) => room ? {
    roomType: room.roomType, name: room.name, slug: room.slug, description: room.description || '', shortDescription: room.shortDescription || '', images: '',
    capacityMin: String(room.capacityMin), capacityMax: String(room.capacityMax), roomCount: String(room.roomCount), maxRoomsPerCustomer: String(room.maxRoomsPerCustomer ?? 1), seatsPerRoom: String(room.seatsPerRoom), pricingType: room.pricingType,
    price: String(room.price), bookingDurationMinutes: String(room.bookingDurationMinutes), availableTimeSlots: room.availableTimeSlots.join(','), amenities: room.amenities.join(','),
    isActive: room.isActive, isBookable: room.isBookable, displayOrder: String(room.displayOrder),
  } : emptyForm();
  const [form, setForm] = useState(() => formFromRoom(editingRoom));
  const [existingImages, setExistingImages] = useState<string[]>(editingRoom?.images || []);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
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

  function addImageFiles(files: File[]) {
    setImageFiles((current) => [...current, ...files.filter((file) => file.type.startsWith('image/'))]);
  }

  async function removeExistingImage(url: string) {
    const response = await fetch(`/api/admin/menu/delete-image?publicId=${encodeURIComponent(url)}`, { method: 'DELETE' });
    if (!response.ok) throw new Error('Unable to delete image');
    setExistingImages((current) => current.filter((image) => image !== url));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const uploadedImages: string[] = [];
      for (const file of imageFiles) {
        const body = new FormData();
        body.append('images', file);
        const uploadResponse = await fetch('/api/admin/dining/upload-images', { method: 'POST', body });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData.success) throw new Error(uploadData.error || 'Image upload failed');
        uploadedImages.push(...uploadData.data);
      }
      const payload = {
        roomType: form.roomType,
        name: form.name,
        slug: form.slug,
        description: form.description || undefined,
        shortDescription: form.shortDescription || undefined,
        images: [...existingImages, ...uploadedImages, ...parseCommaSeparated(form.images)],
        capacityMin: Number(form.capacityMin),
        capacityMax: Number(form.capacityMax),
        roomCount: Number(form.roomCount),
        maxRoomsPerCustomer: Number(form.maxRoomsPerCustomer),
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

      const response = await fetch(editingRoom ? `/api/admin/dining/rooms/${editingRoom._id}` : '/api/admin/dining/rooms', {
        method: editingRoom ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || 'Failed to save dining room');
      setMessage(editingRoom ? 'Dining room updated successfully' : 'Dining room created successfully');
      onSaved?.(json.data);
      if (!editingRoom) setForm(emptyForm());
      setImageFiles([]);
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

        <label className="block text-sm">
          Max rooms per customer
          <input
            type="number"
            min="1"
            value={form.maxRoomsPerCustomer}
            onChange={(e) => updateField('maxRoomsPerCustomer', e.target.value)}
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

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <p className="text-sm font-semibold text-stone-900">Room images</p>
        {existingImages.length ? <div className="mt-3 grid gap-3 sm:grid-cols-3">{existingImages.map((url) => <div key={url} className="relative"><Image src={url} alt="Dining room" width={400} height={280} className="h-28 w-full rounded-xl object-cover" /><button type="button" onClick={() => removeExistingImage(url).catch((error) => setMessage(error.message))} className="absolute right-2 top-2 rounded-full bg-white px-2 py-1 text-xs font-semibold text-red-700">Remove</button></div>)}</div> : <p className="mt-2 text-xs text-stone-500">No room images uploaded yet.</p>}
        <div className="mt-4 rounded-2xl border-2 border-dashed border-stone-300 bg-white p-5 text-center" onDrop={(event) => { event.preventDefault(); addImageFiles(Array.from(event.dataTransfer.files)); }} onDragOver={(event) => event.preventDefault()}>
          <input id="dining-room-images" type="file" multiple accept="image/*" className="sr-only" onChange={(event) => { addImageFiles(Array.from(event.target.files || [])); event.target.value = ''; }} />
          <label htmlFor="dining-room-images" className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white">Choose images from device</label>
          <p className="mt-2 text-xs text-stone-500">Or drag and drop one or more images here.</p>
          {imageFiles.length ? <p className="mt-2 text-xs font-semibold text-stone-700">{imageFiles.length} new image(s) selected</p> : null}
        </div>
      </div>

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
          {isSubmitting ? 'Saving...' : editingRoom ? 'Save Dining Room' : 'Create Dining Room'}
        </button>
        {editingRoom ? <button type="button" onClick={onCancel} className="rounded-full border border-stone-300 px-5 py-2 text-sm font-semibold text-stone-700">Cancel</button> : null}
        {message ? <p className="text-sm text-stone-600">{message}</p> : null}
      </div>
    </form>
  );
}

export default DiningRoomForm;
