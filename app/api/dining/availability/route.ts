import { NextResponse } from 'next/server';
import { getAvailableDiningTimeSlots } from '@/src/services/dining-service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get('roomId')?.trim();
  const bookingDate = url.searchParams.get('date')?.trim();
  if (!roomId || !bookingDate) return NextResponse.json({ error: 'roomId and date are required' }, { status: 400 });

  try {
    const slots = await getAvailableDiningTimeSlots(roomId, bookingDate);
    return NextResponse.json({ success: true, data: slots });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to check availability' }, { status: 400 });
  }
}