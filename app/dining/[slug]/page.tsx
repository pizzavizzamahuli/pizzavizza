/* eslint-disable @next/next/no-img-element */
import { notFound } from 'next/navigation';
import { CustomerShell } from '@/src/app-shell';
import { getDiningRoom } from '@/src/services/dining-service';
import { DiningBookingForm } from '@/src/components/dining/booking-form';

export default async function DiningRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = await getDiningRoom(slug);
  if (!room || !room.isActive || !room.isBookable) {
    return notFound();
  }

  return (
    <CustomerShell>
      <div className="space-y-8">
        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          {room.images?.length ? <div className="mb-6 grid gap-3 sm:grid-cols-2">{room.images.map((image) => <img key={image} src={image} alt={room.name} className="aspect-[4/3] w-full rounded-2xl object-cover" />)}</div> : null}
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">{room.name}</p>
              <h1 className="mt-3 text-3xl font-semibold text-stone-900">Reserve your dining experience</h1>
              <p className="mt-4 max-w-2xl text-sm text-stone-600">{room.shortDescription || room.description}</p>
            </div>
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-6 text-center">
              <p className="text-sm text-stone-500">Starting price</p>
              <p className="mt-2 text-3xl font-semibold text-amber-700">₹{room.price}</p>
              <p className="mt-2 text-xs text-stone-500">{room.roomType} • {room.roomCount} room(s) • {room.seatsPerRoom} seats/room</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6 rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">What to expect</h2>
              <ul className="mt-4 space-y-3 text-sm text-stone-600">
                <li>• Capacity {room.capacityMin} to {room.capacityMax} guests</li>
                <li>• {room.roomCount} room(s) configured • {room.seatsPerRoom} seats per room</li>
                <li>• Booking duration {room.bookingDurationMinutes} minutes</li>
                <li>• Available time slots: {room.availableTimeSlots.join(', ') || 'Not available'}</li>
                <li>• Private seating, curated ambiance, and personalized service</li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-stone-900">Amenities</h3>
              <div className="mt-4 flex flex-wrap gap-2">
                {room.amenities.map((amenity) => (
                  <span key={amenity} className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1 text-sm text-stone-600">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <DiningBookingForm
              roomId={room._id?.toHexString() || ''}
              roomName={room.name}
              availableTimeSlots={room.availableTimeSlots}
              price={room.price}
              capacityMin={room.capacityMin}
              capacityMax={room.capacityMax}
              roomCount={room.roomCount ?? 1}
              seatsPerRoom={room.seatsPerRoom ?? room.capacityMax}
              pricingType={room.pricingType}
              bookingDurationMinutes={room.bookingDurationMinutes}
            />
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
