import type {
  RestaurantDayKey,
  RestaurantSettingsDocument,
  RestaurantWeeklySchedule,
  RestaurantSpecialDate,
} from '@/src/models/restaurant-settings';

export type RestaurantAvailabilityStatus = 'OPEN' | 'CLOSED';

export interface RestaurantAvailability {
  status: RestaurantAvailabilityStatus;
  reason: 'MANUAL_CLOSURE' | 'MANUAL_OPEN' | 'WEEKLY_SCHEDULE' | 'OUTSIDE_OPERATING_HOURS';
  reasonMessage: string;
  openTime: string | null;
  closeTime: string | null;
  timezone: string;
  nextOpenAt?: string | null;
}

const dayKeys: RestaurantDayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

function getLocalParts(date: Date, timezone: string) {
  let formatter: Intl.DateTimeFormat;
  try {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
  const parts = formatter.formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(values.weekday);
  return { day: dayKeys[weekday < 0 ? 0 : weekday], time: `${values.hour === '24' ? '00' : values.hour}:${values.minute}` };
}

function getSchedule(settings: RestaurantSettingsDocument): RestaurantWeeklySchedule {
  return settings.weeklySchedule || {
    monday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
    tuesday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
    wednesday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
    thursday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
    friday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
    saturday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
    sunday: { isOpen: true, openTime: '11:00', closeTime: '23:00' },
  };
}

function findSpecialDate(settings: RestaurantSettingsDocument, date: string): RestaurantSpecialDate | null {
  return (settings.specialDates || []).find((item) => item.date === date) || null;
}

export function getRestaurantAvailability(settings: RestaurantSettingsDocument, now = new Date()): RestaurantAvailability {
  const timezone = settings.restaurantTimezone || 'Asia/Kolkata';
  const local = getLocalParts(now, timezone);
  let date: string;
  try {
    date = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  } catch {
    date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  }
  const currentAvailability = getRestaurantAvailabilityAt(settings, local.day, local.time, date);
  if (currentAvailability.status === 'OPEN') return currentAvailability;

  const currentDayIndex = dayKeys.indexOf(local.day);
  const previousDay = dayKeys[(currentDayIndex + dayKeys.length - 1) % dayKeys.length];
  const previousDateValue = new Date(`${date}T12:00:00Z`);
  previousDateValue.setUTCDate(previousDateValue.getUTCDate() - 1);
  const previousDate = previousDateValue.toISOString().slice(0, 10);
  const previousSchedule = findSpecialDate(settings, previousDate) || getSchedule(settings)[previousDay];
  const previousOpenTime = previousSchedule?.openTime || '00:00';
  const previousCloseTime = previousSchedule?.closeTime || '23:59';
  if (previousSchedule?.isOpen && previousCloseTime < previousOpenTime && local.time < previousCloseTime) {
    return {
      status: 'OPEN',
      reason: 'WEEKLY_SCHEDULE',
      reasonMessage: 'Restaurant is open according to its overnight schedule.',
      openTime: previousOpenTime,
      closeTime: previousCloseTime,
      timezone,
      nextOpenAt: previousSchedule.openTime,
    };
  }
  return currentAvailability;
}

export function getRestaurantAvailabilityAt(settings: RestaurantSettingsDocument, day: RestaurantDayKey, time: string, date?: string): RestaurantAvailability {
  const timezone = settings.restaurantTimezone || 'Asia/Kolkata';
  const special = date ? findSpecialDate(settings, date) : null;
  const schedule = special ? { isOpen: special.isOpen, openTime: special.openTime || '00:00', closeTime: special.closeTime || '23:59' } : getSchedule(settings)[day];
  if (settings.manualAvailabilityOverride === 'CLOSED') {
    return { status: 'CLOSED', reason: 'MANUAL_CLOSURE', reasonMessage: settings.manualAvailabilityReason || 'Restaurant is manually closed.', openTime: schedule?.openTime || null, closeTime: schedule?.closeTime || null, timezone };
  }
  if (settings.manualAvailabilityOverride === 'OPEN') {
    return { status: 'OPEN', reason: 'MANUAL_OPEN', reasonMessage: 'Restaurant is manually open.', openTime: schedule?.openTime || null, closeTime: schedule?.closeTime || null, timezone };
  }
  if (!schedule?.isOpen) {
    return { status: 'CLOSED', reason: 'WEEKLY_SCHEDULE', reasonMessage: special?.label ? `${special.label}: restaurant is closed.` : 'Restaurant is closed today.', openTime: null, closeTime: null, timezone, nextOpenAt: null };
  }
  const isOvernight = schedule.closeTime < schedule.openTime;
  const inHours = isOvernight
    ? time >= schedule.openTime || time < schedule.closeTime
    : time >= schedule.openTime && time < schedule.closeTime;
  return { status: inHours ? 'OPEN' : 'CLOSED', reason: inHours ? 'WEEKLY_SCHEDULE' : 'OUTSIDE_OPERATING_HOURS', reasonMessage: inHours ? 'Restaurant is open according to its schedule.' : `Restaurant is closed outside operating hours (${schedule.openTime} - ${schedule.closeTime}).`, openTime: schedule.openTime, closeTime: schedule.closeTime, timezone, nextOpenAt: schedule.openTime };
}

export function assertRestaurantOpen(settings: RestaurantSettingsDocument, message = 'Pizza Vizza is currently closed. Please try again when the restaurant is open.') {
  const availability = getRestaurantAvailability(settings);
  if (availability.status !== 'OPEN') throw new Error(`${message} ${availability.reasonMessage}`);
  return availability;
}

export function assertRestaurantOpenAt(settings: RestaurantSettingsDocument, day: RestaurantDayKey, time: string, date?: string) {
  const availability = getRestaurantAvailabilityAt(settings, day, time, date);
  if (availability.status !== 'OPEN') throw new Error(`Restaurant is closed for this time. ${availability.reasonMessage}`);
  return availability;
}

export function assertRestaurantOpenForBooking(settings: RestaurantSettingsDocument, bookingDate: string, startTime: string, endTime: string) {
  const [year, month, dayNumber] = bookingDate.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, dayNumber));
  const day = dayKeys[date.getUTCDay()];
  const start = assertRestaurantOpenAt(settings, day, startTime, bookingDate);
  if (start.openTime && start.closeTime && endTime > start.closeTime && start.openTime <= start.closeTime) {
    throw new Error(`This booking ends after restaurant closing time (${start.closeTime}).`);
  }
  return start;
}
