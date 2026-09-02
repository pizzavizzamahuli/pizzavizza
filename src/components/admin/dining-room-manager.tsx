'use client';

import { useState } from 'react';
import type { DiningRoomDocument } from '@/src/models/dining-room';
import DiningRoomForm from '@/src/components/admin/dining-room-form';

export default function DiningRoomManager({ initialRooms }: { initialRooms: DiningRoomDocument[] }) {
  const [rooms, setRooms] = useState(initialRooms);
  const [editingRoom, setEditingRoom] = useState<DiningRoomDocument | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  function handleSaved(room: DiningRoomDocument) {
    setRooms((current) => {
      const exists = current.some((item) => item._id?.toHexString() === room._id?.toHexString());
      return exists ? current.map((item) => item._id?.toHexString() === room._id?.toHexString() ? room : item) : [room, ...current];
    });
    setEditingRoom(null);
  }

  async function archiveRoom(room: DiningRoomDocument) {
    if (!window.confirm(`Deactivate ${room.name}? Existing booking history will be preserved.`)) return;
    const response = await fetch(`/api/admin/dining/rooms/${room._id?.toHexString()}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isActive: false, isBookable: false }) });
    const json = await response.json();
    if (!response.ok) { setMessage(json.error || 'Unable to deactivate room'); return; }
    handleSaved(json.data);
    setMessage('Dining room deactivated.');
  }

  return (
    <>
      <DiningRoomForm key={editingRoom?._id?.toHexString() || 'new'} editingRoom={editingRoom} onSaved={handleSaved} onCancel={() => setEditingRoom(null)} />
      {message ? <p className="mt-3 text-sm text-stone-600" role="status">{message}</p> : null}
      <div className="mt-6 grid gap-4">
        {rooms.map((room) => (
          <article key={room._id?.toHexString()} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="min-w-0"><p className="break-words text-lg font-semibold text-stone-900">{room.name}</p><p className="text-sm text-stone-500">{room.slug}</p></div>
              <div className="flex flex-wrap gap-2"><button type="button" onClick={() => setEditingRoom(room)} className="min-h-11 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700">Edit</button><button type="button" onClick={() => archiveRoom(room).catch(() => setMessage('Unable to deactivate room'))} className="min-h-11 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700">Deactivate</button></div>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2"><div>Capacity: {room.capacityMin}–{room.capacityMax}</div><div>Duration: {room.bookingDurationMinutes} mins</div><div>Price: ₹{room.price}</div><div>Type: {room.pricingType}</div></div>
          </article>
        ))}
      </div>
    </>
  );
}