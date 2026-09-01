import { requireAdminAccess } from '@/src/auth/guard';
import { adminListDiningRooms } from '@/src/services/dining-service';
import { DiningRoomForm } from '@/src/components/admin/dining-room-form';

export default async function AdminDiningRoomsPage() {
  await requireAdminAccess();
  const rooms = await adminListDiningRooms();

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Dining Rooms</h1>
        <p className="text-sm text-stone-600">Create and manage private dining room experiences.</p>
        <div className="mt-6">
          <DiningRoomForm />
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold">Existing Rooms</h2>
        <p className="mt-2 text-sm text-stone-600">Review room configuration and availability status.</p>
        {rooms.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-stone-200 bg-stone-50 p-6 text-stone-600">
            No dining rooms defined yet.
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {rooms.map((room) => (
              <article key={room._id?.toHexString()} className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-stone-900">{room.name}</p>
                    <p className="text-sm text-stone-500">{room.slug}</p>
                  </div>
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{room.isBookable ? 'Bookable' : 'Not bookable'}</span>
                </div>
                <div className="mt-3 grid gap-2 text-sm text-stone-600 sm:grid-cols-2">
                  <div>Capacity: {room.capacityMin}–{room.capacityMax}</div>
                  <div>Duration: {room.bookingDurationMinutes} mins</div>
                  <div>Price: ₹{room.price}</div>
                  <div>Type: {room.pricingType}</div>
                </div>
                <p className="mt-3 text-sm text-stone-600">Amenities: {room.amenities.join(', ') || 'None'}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
