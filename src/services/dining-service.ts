import { getNextSequence, getCountersCollection } from '@/src/models/counter';
import { calculatePromotions } from '@/src/services/promo-service';
import { reserveCouponUsage } from '@/src/models/coupon';
import { getDatabaseClient } from '@/src/config/database';
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
  findDiningBookingById,
  findDiningBookingByBookingNumber,
  findDiningBookingByIdempotencyKey,
  findDiningBookingsForRoomOnDate,
  listDiningBookings,
  listDiningBookingsForUser,
  updateDiningBooking,
  canTransitionDiningBookingStatus,
} from '@/src/models/dining-booking';
import { getUserById } from '@/src/services/user-service';
import { findDiningAvailabilityBlockForRoom } from '@/src/models/dining-availability-block';
import { isDiningSlotAvailable } from '@/src/services/dining-availability-service';
import { touchDiningAvailabilityLock } from '@/src/models/dining-availability-lock';

export async function formatDiningBookingNumber(session?: import('mongodb').ClientSession) {
  const seq = await getNextSequence('dining_bookings', session);
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

const DiningRoomSchemaBase = z.object({
  roomType: z.string().min(1).optional(),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().optional(),
  shortDescription: z.string().optional(),
  images: z.array(z.string().url()).optional(),
  capacityMin: z.number().int().min(1),
  capacityMax: z.number().int().min(1),
  roomCount: z.number().int().min(1).optional(),
  maxRoomsPerCustomer: z.number().int().min(1).optional(),
  seatsPerRoom: z.number().int().min(1).optional(),
  pricingType: z.enum(['FIXED', 'PER_HOUR', 'PER_BOOKING']),
  price: z.number().min(0),
  bookingDurationMinutes: z.number().int().min(15),
  availableTimeSlots: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
  isActive: z.boolean().optional(),
  isBookable: z.boolean().optional(),
  displayOrder: z.number().int().optional(),
  amenities: z.array(z.string()).optional(),
});

function validateDiningRoomCapacity(data: { capacityMin?: number; capacityMax?: number }, ctx: z.RefinementCtx) {
  if (data.capacityMin !== undefined && data.capacityMax !== undefined && data.capacityMax < data.capacityMin) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'capacityMax must be greater than or equal to capacityMin',
      path: ['capacityMax'],
    });
  }
}

const DiningRoomSchema = DiningRoomSchemaBase.superRefine(validateDiningRoomCapacity);
const DiningRoomUpdateSchema = DiningRoomSchemaBase.partial().superRefine(validateDiningRoomCapacity);

export async function adminListDiningRooms() {
  return listDiningRooms();
}

export async function adminCreateDiningRoom(input: unknown) {
  const data = DiningRoomSchema.parse(input);
  return createDiningRoom(data as Partial<DiningRoomDocument>);
}

export async function adminUpdateDiningRoom(id: string, input: unknown) {
  const data = DiningRoomUpdateSchema.parse(input);
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

function parseTimeMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return NaN;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours <= 23 && minutes <= 59 ? hours * 60 + minutes : NaN;
}

function validateBookingInput({ room, bookingDate, startTime, guestCount, roomCount, durationMinutes }: { room: DiningRoomDocument; bookingDate: string; startTime: string; guestCount: number; roomCount: number; durationMinutes: number }) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) throw new Error('Please select a valid booking date.');
  const [year, month, day] = bookingDate.split('-').map(Number);
  const parsedDate = new Date(year, month - 1, day);
  if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) throw new Error('Please select a valid booking date.');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsedDate < today) throw new Error('Past booking dates are not available.');
  const startMinutes = parseTimeMinutes(startTime);
  if (!Number.isFinite(startMinutes)) throw new Error('Please select a valid time slot.');
  if (room.availableTimeSlots.length && !room.availableTimeSlots.includes(startTime)) throw new Error('That time slot is not available for this room.');
  if (!Number.isInteger(guestCount) || guestCount < room.capacityMin || guestCount > room.capacityMax) throw new Error(`Guest count must be between ${room.capacityMin} and ${room.capacityMax}.`);
  if (!Number.isInteger(roomCount) || roomCount < 1 || roomCount > (room.roomCount ?? 1)) throw new Error(`You can reserve between 1 and ${room.roomCount ?? 1} room(s).`);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 15 || durationMinutes > 24 * 60 || startMinutes + durationMinutes > 24 * 60) throw new Error('Booking duration or time is invalid.');
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
  userId,
  session,
}: {
  roomId: string;
  bookingDate: string;
  startTime: string;
  guestCount: number;
  roomCount?: number;
  durationMinutes?: number;
  userId?: string;
  session?: import('mongodb').ClientSession;
}) {
  const room = await findDiningRoomById(roomId, session);
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
  const maxRoomsPerCustomer = Math.max(1, Number((room as DiningRoomDocument & { maxRoomsPerCustomer?: number }).maxRoomsPerCustomer ?? 1));

  if (userId) {
    const userBookings = (await findDiningBookingsForRoomOnDate(roomId, bookingDate, session)).filter((booking) => booking.userId === userId && !isDiningSlotAvailable(booking.startTime, booking.endTime, startTime, calculateBookingEndTime(startTime, effectiveDuration)));
    const userBookedRooms = userBookings.reduce((total, booking) => total + Math.max(1, booking.roomCount || 1), 0);
    if (userBookedRooms + safeRoomCount > maxRoomsPerCustomer) {
      return { available: false, reason: `A customer can book at most ${maxRoomsPerCustomer} room(s) for this room in the same slot.` };
    }
  }

  const block = await findDiningAvailabilityBlockForRoom(roomId, bookingDate, startTime, effectiveDuration, session);
  if (block) {
    return { available: false, reason: 'Booking time is blocked for this room' };
  }

  const bookings = await findDiningBookingsForRoomOnDate(roomId, bookingDate, session);
  const endTime = calculateBookingEndTime(startTime, effectiveDuration);

  const overlappingRooms = bookings
    .filter((booking) => !isDiningSlotAvailable(booking.startTime, booking.endTime, startTime, endTime))
    .reduce((total, booking) => total + Math.max(1, booking.roomCount || 1), 0);
  if (overlappingRooms + safeRoomCount > (room.roomCount ?? 1)) {
    return { available: false, reason: 'Time slot already booked' };
  }

  if (userId) {
    const sameCustomerActiveRoomBookings = bookings
      .filter((booking) => booking.userId === userId && !isDiningSlotAvailable(booking.startTime, booking.endTime, startTime, endTime))
      .reduce((total, booking) => total + Math.max(1, booking.roomCount || 1), 0);
    if (sameCustomerActiveRoomBookings + safeRoomCount > maxRoomsPerCustomer) {
      return { available: false, reason: `A customer can book at most ${maxRoomsPerCustomer} room(s) for this room in the same slot.` };
    }
  }

  return { available: true, room, endTime };
}

export async function getAvailableDiningTimeSlots(roomId: string, bookingDate: string) {
  const room = await findDiningRoomById(roomId);
  if (!room || !room.isActive || !room.isBookable) return [];
  const slots = room.availableTimeSlots || [];
  const available: string[] = [];
  for (const startTime of slots) {
    const result = await checkDiningRoomAvailability({
      roomId,
      bookingDate,
      startTime,
      guestCount: room.capacityMin,
      roomCount: 1,
      durationMinutes: room.bookingDurationMinutes,
    });
    if (result.available) available.push(startTime);
  }
  return available;
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
  paymentMethod,
  couponCode,
  idempotencyKey,
}: {
  userId: string;
  roomId: string;
  bookingDate: string;
  startTime: string;
  guestCount: number;
  roomCount?: number;
  durationMinutes?: number;
  customerNote?: string | null;
  paymentMethod?: 'ONLINE' | 'COD' | null;
  couponCode?: string | null;
  idempotencyKey?: string | null;
}) {
  const room = await findDiningRoomById(roomId);
  if (!room) throw new Error('Room not found');
  const user = await getUserById(userId);
  if (!user) throw new Error('User not found');
  if (idempotencyKey) {
    const existing = await findDiningBookingByIdempotencyKey(idempotencyKey);
    if (existing && existing.userId === userId) return existing;
  }

  const effectiveDuration = Math.max(15, Number(durationMinutes) || room.bookingDurationMinutes || 60);
  const effectiveRoomCount = Math.max(1, Number(roomCount) || 1);
  validateBookingInput({ room, bookingDate, startTime, guestCount, roomCount: effectiveRoomCount, durationMinutes: effectiveDuration });
  const availability = await checkDiningRoomAvailability({
    roomId,
    bookingDate,
    startTime,
    guestCount,
    roomCount: effectiveRoomCount,
    durationMinutes: effectiveDuration,
    userId,
  });
  if (!availability.available) {
    throw new Error(availability.reason);
  }

  const endTime = availability.endTime || calculateBookingEndTime(startTime, effectiveDuration);
  const price = calculateDiningBookingPrice({ room, roomCount: effectiveRoomCount, durationMinutes: effectiveDuration });
  const normalizedPaymentMethod = paymentMethod === 'ONLINE' ? 'ONLINE' : 'COD';
  const client = await getDatabaseClient();
  await getCountersCollection();
  const session = client.startSession();
  let booking: DiningBookingDocument | null = null;
  try {
    await session.withTransaction(async () => {
      await touchDiningAvailabilityLock(roomId, bookingDate, session);
      const finalAvailability = await checkDiningRoomAvailability({
        roomId,
        bookingDate,
        startTime,
        guestCount,
        roomCount: effectiveRoomCount,
        durationMinutes: effectiveDuration,
        userId,
        session,
      });
      if (!finalAvailability.available) throw new Error(finalAvailability.reason);
      const promo = await calculatePromotions({
        userId,
        subtotal: price,
        deliveryCharge: 0,
        additionalCharges: 0,
        fulfillmentType: 'PICKUP',
        couponCode: couponCode || null,
        paymentMethod: normalizedPaymentMethod,
      }, session);
      if (promo.coupon?._id && !(await reserveCouponUsage(promo.coupon._id.toHexString(), session))) {
        throw new Error('Coupon usage limit reached');
      }
      const bookingNumber = await formatDiningBookingNumber(session);
      booking = await createDiningBooking({
        bookingNumber,
        idempotencyKey: idempotencyKey ?? null,
        userId,
        roomId,
        roomSnapshot: createDiningRoomSnapshot(room),
        customerSnapshot: { userId, name: user.name, email: user.email, mobile: user.mobile || null },
        bookingDate,
        startTime,
        endTime: finalAvailability.endTime || endTime,
        guestCount,
        roomCount: effectiveRoomCount,
        durationMinutes: effectiveDuration,
        price,
        discount: promo.discountAmount,
        couponCode: promo.couponCode,
        finalAmount: promo.totalAmount,
        paymentMethod: normalizedPaymentMethod,
        paymentStatus: normalizedPaymentMethod === 'ONLINE' ? 'PENDING' : 'NOT_REQUIRED',
        bookingStatus: 'PENDING',
        customerNote: customerNote ?? null,
        statusHistory: [{ previousStatus: undefined, newStatus: 'PENDING', performedBy: userId, note: 'Booking created', createdAt: new Date() }],
      }, session);
    });
  } finally {
    await session.endSession();
  }
  if (!booking) throw new Error('Unable to create booking. Please try again.');

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
  const current = await findDiningBookingById(id);
  if (!current) throw new Error('Booking not found');
  if (!canTransitionDiningBookingStatus(current.bookingStatus, status)) {
    throw new Error(`Cannot change booking from ${current.bookingStatus} to ${status}.`);
  }
  const booking = await updateDiningBooking(id, {
    bookingStatus: status,
    statusHistory: [...(current.statusHistory || []), { previousStatus: current.bookingStatus, newStatus: status, performedBy, note: note || '', createdAt: new Date() }],
  });
  return booking;
}

export async function cancelBookingForUser(userId: string, bookingNumber: string) {
  const booking = await findDiningBookingByBookingNumber(bookingNumber);
  if (!booking || booking.userId !== userId) throw new Error('Booking not found');
  if (!canTransitionDiningBookingStatus(booking.bookingStatus, 'CANCELLED')) {
    throw new Error('This booking can no longer be cancelled.');
  }
  return updateDiningBooking(booking._id!.toHexString(), {
    bookingStatus: 'CANCELLED',
    statusHistory: [...(booking.statusHistory || []), {
      previousStatus: booking.bookingStatus,
      newStatus: 'CANCELLED',
      performedBy: userId,
      note: 'Cancelled by customer',
      createdAt: new Date(),
    }],
  });
}
