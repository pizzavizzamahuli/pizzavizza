import Link from 'next/link';
import { CustomerShell } from '@/src/app-shell';
import { getAvailableDiningRooms } from '@/src/services/dining-service';
import { DiningRoomDocument } from '@/src/models/dining-room';

export default async function DiningHomePage() {
  const rooms: DiningRoomDocument[] = await getAvailableDiningRooms();

  return (
    <CustomerShell>
      <div className="space-y-8">
        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Private Dining</p>
          <h1 className="mt-3 text-3xl font-semibold text-stone-900">Reserve a private dining room</h1>
          <p className="mt-4 text-sm text-stone-600">Choose a dining room, pick a time slot, and book an intimate experience for your group.</p>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          {rooms.map((room) => (
            <article key={room._id?.toHexString()} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              {room.images?.[0] ? <img src={room.images[0]} alt={room.name} className="mb-5 aspect-[16/9] w-full rounded-2xl object-cover" /> : null}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-stone-900">{room.name}</h2>
                    <p className="text-sm text-stone-500">{room.roomType} • {room.roomCount} room(s) • {room.seatsPerRoom} seats/room</p>
                  </div>
                  <div className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">₹{room.price}</div>
                </div>
                <p className="text-sm text-stone-600">{room.shortDescription || room.description}</p>
                <div className="flex flex-wrap gap-2">
                  {room.amenities.slice(0, 4).map((amenity) => (
                    <span key={amenity} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-xs font-medium text-stone-600">
                      {amenity}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-sm text-stone-500">Duration {room.bookingDurationMinutes} mins</span>
                  <Link href={`/dining/${room.slug}`} className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                    Book now
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      </div>
    </CustomerShell>
  );
}
