import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { createDiningBookingForUser } from '@/src/services/dining-service';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  try {
    const payload = await request.json();
    const { roomId, bookingDate, startTime, guestCount, roomCount, durationMinutes, customerNote } = payload;

    if (!roomId) return NextResponse.json({ error: 'roomId is required' }, { status: 400 });
    if (!bookingDate) return NextResponse.json({ error: 'bookingDate is required' }, { status: 400 });
    if (!startTime) return NextResponse.json({ error: 'startTime is required' }, { status: 400 });
    if (!guestCount || typeof guestCount !== 'number') return NextResponse.json({ error: 'guestCount is required' }, { status: 400 });
    if (typeof roomCount !== 'number' || roomCount < 1) return NextResponse.json({ error: 'roomCount is required' }, { status: 400 });
    if (typeof durationMinutes !== 'number' || durationMinutes < 15) return NextResponse.json({ error: 'durationMinutes must be at least 15' }, { status: 400 });

    const booking = await createDiningBookingForUser({
      userId: user._id!.toHexString(),
      roomId,
      bookingDate,
      startTime,
      guestCount,
      roomCount,
      durationMinutes,
      customerNote,
    });

    return NextResponse.json({ success: true, data: { bookingNumber: booking.bookingNumber, bookingId: booking.id } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to create booking';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
