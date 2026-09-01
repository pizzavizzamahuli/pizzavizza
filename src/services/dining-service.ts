import { getNextSequence } from '@/src/models/counter';
import { z } from 'zod';
import {
  DiningRoomDocument,
  findDiningRoomById,
  findDiningRoomBySlug,
  listDiningRooms,
  createDiningRoom,
  updateDiningRoom,
} from '@/src/models/dining-room';
import {
  DiningBookingDocument,
  DiningBookingStatus,
  DiningRoomSnapshot,
  createDiningBooking,
  findDiningBookingByBookingNumber,
  listDiningBookings,
  listDiningBookingsForUser,
  updateDiningBooking,
} from '@/src/models/dining-booking';
import { getUserById } from '@/src/services/user-service';
import { findDiningAvailabilityBlockForRoom } from '@/src/models/dining-availability-block';
import { findDiningBookingsForRoomOnDate, isDiningSlotAvailable } from '@/src/services/dining-availability-service';

export async function formatDiningBookingNumber() {
  const seq = await getNextSequence('dining_bookings');
  const year = new Date().getFullYear();
  const num = String(seq).padStart(6, '0');
  return `PV-BK-${year}-${num}`;
}

export async function getAvailableDiningRooms() {
  return listDiningRooms({ isActive: true, isBookable: true });
}

export async function getDiningRoom(slug: string) {
  return findDiningRoomBySlug(slug);
}

const DiningRoomSchema = z.object({
  roomType: z.string().min(1).optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  capacityMin: z.number().int().min(1),
  capacityMax: z.number().int().min(1),
  roomCount: z.number().int().min(1).optional(),
  seatsPerRoom: z.number().int().min(1).optional(),
  pricingType: z.enum(['FIXED', 'PER_HOUR', 'PER_BOOKING']),
  price: z.number().min(0),
  bookingDurationMinutes: z.number().int().min(15),
  availableTimeSlots: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
  isActive: z.boolean().optional(),
  isBookable: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  amenities: z.array(z.string()).optional(),
}).superRefine((data, ctx) => {
  if (data.capacityMin !== undefined && data.capacityMax !== undefined && data.capacityMax < data.capacityMin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'capacityMax must be greater than or equal to capacityMin',
      path: ['capacityMax'],
    });
  }
});

export async function adminListDiningRooms() {
  return listDiningRooms();
}

export async function adminCreateDiningRoom(input: unknown) {
  const data = DiningRoomSchema.parse(input);
  return createDiningRoom(data as Partial<DiningRoomDocument>);
}

export async function adminUpdateDiningRoom(id: string, input: unknown) {
  const data = DiningRoomSchema.partial().parse(input);
  return updateDiningRoom(id, data as Partial<DiningRoomDocument>);
}

export async function getDiningRoomById(id: string) {
  return findDiningRoomById(id);
}

export function createDiningRoomSnapshot(room: DiningRoomDocument): DiningRoomSnapshot {
  return {
    roomId: room._id?.toHexString() || '',
    roomType: room.roomType || room.name,
    name: room.name,
    slug: room.slug,
    description: room.description || null,
    shortDescription: room.shortDescription || null,
    images: room.images || [],
    capacityMin: room.capacityMin,
    capacityMax: room.capacityMax,
    roomCount: room.roomCount ?? 1,
    seatsPerRoom: room.seatsPerRoom ?? room.capacityMax ?? 1,
    pricingType: room.pricingType,
    price: room.price,
    bookingDurationMinutes: room.bookingDurationMinutes,
  };
}

export function calculateBookingEndTime(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(':').map((value) => Number(value));
  const start = new Date();
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + durationMinutes * 60000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${pad(end.getHours())}:${pad(end.getMinutes())}`;
}

export function calculateDiningBookingPrice({
  room,
  roomCount,
  durationMinutes,
}: {
  room: Pick<DiningRoomDocument, 'price' | 'pricingType' | 'bookingDurationMinutes' | 'roomCount'>;
  roomCount: number;
  durationMinutes: number;
}) {
  const safeRoomCount = Math.max(1, Number(roomCount) || 1);
  const safeDurationMinutes = Math.max(15, Number(durationMinutes) || room.bookingDurationMinutes || 60);
  const hours = safeDurationMinutes / 60;

  if (room.pricingType === 'PER_HOUR') {
    return room.price * hours * safeRoomCount;
  }

  if (room.pricingType === 'PER_BOOKING') {
    return room.price * safeRoomCount;
  }

  return room.price * safeRoomCount;
}

export async function checkDiningRoomAvailability({
  roomId,
  bookingDate,
  startTime,
  guestCount,
  roomCount,
  durationMinutes,
}: {
  roomId: string;
  bookingDate: string;
  startTime: string;
  guestCount: number;
  roomCount?: number;
  durationMinutes?: number;
}) {
  const room = await findDiningRoomById(roomId);
  if (!room) {
    return { available: false, reason: 'Room not found' };
  }

  if (!room.isActive || !room.isBookable) {
    return { available: false, reason: 'Room is not available for booking' };
  }

  const safeRoomCount = Math.max(1, Number(roomCount) || 1);
  if (safeRoomCount > (room.roomCount ?? 1)) {
    return { available: false, reason: `Only ${room.roomCount ?? 1} room(s) are available for this booking` };
  }

  if (guestCount < room.capacityMin || guestCount > room.capacityMax) {
    return { available: false, reason: 'Guest count outside room capacity' };
  }

  const effectiveDuration = Math.max(15, Number(durationMinutes) || room.bookingDurationMinutes || 60);
  const block = await findDiningAvailabilityBlockForRoom(roomId, bookingDate, startTime, effectiveDuration);
  if (block) {
    return { available: false, reason: 'Booking time is blocked for this room' };
  }

  const bookings = await findDiningBookingsForRoomOnDate(roomId, bookingDate);
  const endTime = calculateBookingEndTime(startTime, effectiveDuration);

  const conflict = bookings.some((booking) => !isDiningSlotAvailable(booking.startTime, booking.endTime, startTime, endTime));
  if (conflict) {
    return { available: false, reason: 'Time slot already booked' };
  }

  return { available: true, room, endTime };
}

export async function createDiningBookingForUser({
  userId,
  roomId,
  bookingDate,
  startTime,
  guestCount,
  roomCount,
  durationMinutes,
  customerNote,
}: {
  userId: string;
  roomId: string;
  bookingDate: string;
  startTime: string;
  guestCount: number;
  roomCount?: number;
  durationMinutes?: number;
  customerNote?: string | null;
}) {
  const room = await findDiningRoomById(roomId);
  if (!room) throw new Error('Room not found');
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');

  const effectiveDuration = Math.max(15, Number(durationMinutes) || room.bookingDurationMinutes || 60);
  const effectiveRoomCount = Math.max(1, Number(roomCount) || 1);
  const availability = await checkDiningRoomAvailability({
    roomId,
    bookingDate,
    startTime,
    guestCount,
    roomCount: effectiveRoomCount,
    durationMinutes: effectiveDuration,
  });
  if (!availability.available) {
    throw new Error(availability.reason);
  }

  const endTime = availability.endTime || calculateBookingEndTime(startTime, effectiveDuration);
  const bookingNumber = await formatDiningBookingNumber();
  const price = calculateDiningBookingPrice({ room, roomCount: effectiveRoomCount, durationMinutes: effectiveDuration });
  const discount = 0;
  const finalAmount = price - discount;
  const booking = await createDiningBooking({
    bookingNumber,
    userId,
    roomId,
    roomSnapshot: createDiningRoomSnapshot(room),
    customerSnapshot: { userId, name: user.name, email: user.email, mobile: user.mobile || null },
    bookingDate,
    startTime,
    endTime,
    guestCount,
    roomCount: effectiveRoomCount,
    durationMinutes: effectiveDuration,
    price,
    discount,
    finalAmount,
    paymentMethod: null,
    paymentStatus: 'NOT_REQUIRED',
    bookingStatus: 'PENDING',
    customerNote: customerNote ?? null,
    statusHistory: [{ previousStatus: undefined, newStatus: 'PENDING', performedBy: userId, note: 'Booking created', createdAt: new Date() }],
  });

  // notify admins (best-effort)
  try {
    const { notifyNewBooking } = await import('@/src/services/telegram-service');
    notifyNewBooking(booking).catch(() => {});
  } catch (err) {
    console.error('Telegram notify error (booking)', err);
  }

  return booking;
}

// send notification to admins after booking creation
export async function createDiningBookingForUserAndNotify(payload: Parameters<typeof createDiningBooking>[0]) {
  const booking = await createDiningBooking(payload);
  try {
    const { notifyNewBooking } = await import('@/src/services/telegram-service');
    notifyNewBooking(booking).catch(() => {});
  } catch (err) {
    console.error('Telegram notify error (booking)', err);
  }
  return booking;
}

export async function getBookingForUser(userId: string, bookingNumber: string) {
  const booking = await findDiningBookingByBookingNumber(bookingNumber);
  if (!booking || booking.userId !== userId) return null;
  return booking;
}

export async function listBookingsForUser(userId: string) {
  return listDiningBookingsForUser(userId);
}

export async function listBookings(filter: Partial<DiningBookingDocument> = {}) {
  return listDiningBookings(filter);
}

export async function updateBookingStatus(id: string, status: DiningBookingStatus, performedBy: string, note?: string) {
  const booking = await updateDiningBooking(id, {
    bookingStatus: status,
    statusHistory: [{ previousStatus: undefined, newStatus: status, performedBy, note: note || '', createdAt: new Date() }],
  });
  return booking;
}
