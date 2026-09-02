import { requireAdminAccess } from '@/src/auth/guard';
import { adminListDiningRooms } from '@/src/services/dining-service';
import DiningRoomManager from '@/src/components/admin/dining-room-manager';

export default async function AdminDiningRoomsPage() {
  await requireAdminAccess();
  const rooms = await adminListDiningRooms();
  const serializableRooms = rooms.map((room) => ({
    ...room,
    _id: room._id?.toHexString(),
    createdAt: room.createdAt.toISOString(),
    updatedAt: room.updatedAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Dining Rooms</h1>
        <p className="text-sm text-stone-600">Create and manage private dining room experiences.</p>
        <div className="mt-6">
          <DiningRoomManager initialRooms={serializableRooms} />
        </div>
      </section>

      <section className="rounded-xl border bg-white p-6">
        <h2 className="text-xl font-semibold">Existing Rooms</h2>
        <p className="mt-2 text-sm text-stone-600">Review room configuration and availability status.</p>
        {rooms.length === 0 ? (
          <div className="mt-6 rounded-3xl border border-dashed border-stone-200 bg-stone-50 p-6 text-stone-600">
            No dining rooms defined yet.
          </div>
        ) : <p className="mt-4 text-sm text-stone-600">Use the editor above to manage existing rooms.</p>}
      </section>
    </div>
  );
}
