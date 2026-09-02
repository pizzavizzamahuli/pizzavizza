export function parseTimeString(time: string) {
  const [hours, minutes] = time.split(':').map((value) => Number(value));
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return NaN;
  return hours * 60 + minutes;
}

export function isDiningSlotAvailable(existingStart: string, existingEnd: string, requestedStart: string, requestedEnd: string) {
  const existingStartMinutes = parseTimeString(existingStart);
  const existingEndMinutes = parseTimeString(existingEnd);
  const requestedStartMinutes = parseTimeString(requestedStart);
  const requestedEndMinutes = parseTimeString(requestedEnd);

  return requestedEndMinutes <= existingStartMinutes || requestedStartMinutes >= existingEndMinutes;
}

export async function findDiningBookingsForRoomOnDate(roomId: string, bookingDate: string) {
  const { getDiningBookingsCollection } = await import('@/src/models/dining-booking');
  const col = await getDiningBookingsCollection();
  return col.find({ roomId, bookingDate }).toArray();
}
