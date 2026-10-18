import type { AdCampaignDocument, AdCampaignStatus } from '../models/advertisement';
import { AD_POPUP_PAGES, type AdCampaignPlacement, type AdPopupFrequency } from '../types/advertisements';
import { isAdPlacement, isSafeAdvertisementUrl } from './advertisements';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const STATUSES: AdCampaignStatus[] = ['DRAFT', 'PENDING', 'APPROVED', 'ACTIVE', 'PAUSED', 'REJECTED'];
const FREQUENCIES: AdPopupFrequency[] = ['SESSION', 'DAILY', 'EVERY_VISIT'];

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !DATE_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTimeOrEmpty(value: unknown): value is string | null | undefined {
  return value === null || value === undefined || value === '' || (typeof value === 'string' && TIME_PATTERN.test(value));
}

export function parseAdCampaign(value: unknown, statusAllowed: boolean, cloudName: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const startsOn = input.startsOn;
  const endsOn = input.endsOn;
  const startsAt = validDate(startsOn)
    ? new Date(`${startsOn}T00:00:00.000Z`)
    : typeof input.startsAt === 'string' ? new Date(input.startsAt) : new Date(NaN);
  const endsAt = validDate(endsOn)
    ? new Date(`${endsOn}T23:59:59.999Z`)
    : typeof input.endsAt === 'string' ? new Date(input.endsAt) : new Date(NaN);
  const imageUrl = typeof input.imageUrl === 'string' ? input.imageUrl : '';
  let parsedImage: URL | null = null;
  try { parsedImage = new URL(imageUrl); } catch { /* rejected below */ }
  const status = input.status;
  const price = input.price;
  const email = input.contactEmail;
  const phone = input.contactPhone;
  const whatsapp = input.contactWhatsApp;
  const title = input.title;
  const description = input.description;
  const dailyStartTime = input.dailyStartTime;
  const dailyEndTime = input.dailyEndTime;
  const popupPages = input.popupPages;
  const popupDurationSeconds = input.popupDurationSeconds;
  const closeDelaySeconds = input.closeDelaySeconds;
  const frequency = input.frequency;
  const enabled = input.enabled;
  const popupEnabled = input.popupEnabled;
  const expectedImagePath = `/${cloudName}/image/upload/`;
  const pageListValid = popupPages === undefined
    || (Array.isArray(popupPages) && popupPages.every((page) => AD_POPUP_PAGES.includes(page as (typeof AD_POPUP_PAGES)[number])));
  const validWhatsapp = whatsapp === undefined || whatsapp === null || whatsapp === ''
    || (typeof whatsapp === 'string' && whatsapp.length <= 32 && /^\+?[\d ()-]{7,32}$/.test(whatsapp));
  const datesValid = (startsOn === undefined || startsOn === null || validDate(startsOn))
    && (endsOn === undefined || endsOn === null || validDate(endsOn))
    && (!validDate(startsOn) || !validDate(endsOn) || endsOn >= startsOn);
  const dailyTimesValid = validTimeOrEmpty(dailyStartTime) && validTimeOrEmpty(dailyEndTime)
    && ((!dailyStartTime && !dailyEndTime) || (Boolean(dailyStartTime) && Boolean(dailyEndTime)));
  const validPopupDuration = popupDurationSeconds === undefined
    || (typeof popupDurationSeconds === 'number' && Number.isInteger(popupDurationSeconds) && popupDurationSeconds >= 0 && popupDurationSeconds <= 3600);
  const validCloseDelay = closeDelaySeconds === undefined
    || (typeof closeDelaySeconds === 'number' && Number.isInteger(closeDelaySeconds) && closeDelaySeconds >= 0 && closeDelaySeconds <= 60);
  const validFrequency = frequency === undefined || FREQUENCIES.includes(frequency as AdPopupFrequency);

  if (typeof input.businessName !== 'string' || !input.businessName.trim() || input.businessName.trim().length > 100
    || (title !== undefined && (typeof title !== 'string' || title.trim().length > 120))
    || (description !== undefined && description !== null && (typeof description !== 'string' || description.length > 1000))
    || !parsedImage || parsedImage.protocol !== 'https:' || parsedImage.hostname !== 'res.cloudinary.com'
    || !parsedImage.pathname.startsWith(expectedImagePath) || imageUrl.length > 2048
    || !isSafeAdvertisementUrl(input.destinationUrl)
    || !(isAdPlacement(input.placement) || input.placement === 'NONE')
    || !datesValid
    || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt
    || !dailyTimesValid
    || !pageListValid
    || !validPopupDuration || !validCloseDelay || !validFrequency
    || (enabled !== undefined && typeof enabled !== 'boolean')
    || (popupEnabled !== undefined && typeof popupEnabled !== 'boolean')
    || !validWhatsapp
    || typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 100_000_000
    || (email !== null && email !== undefined && (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    || (phone !== null && phone !== undefined && (typeof phone !== 'string' || phone.length > 32 || !/^[+()\d .-]*$/.test(phone)))
    || (statusAllowed && !STATUSES.includes(status as AdCampaignStatus))) return null;

  return {
    title: typeof title === 'string' && title.trim() ? title.trim() : input.businessName.trim(),
    businessName: input.businessName.trim(),
    imageUrl,
    description: typeof description === 'string' && description.trim() ? description.trim() : null,
    destinationUrl: input.destinationUrl as string,
    contactWhatsApp: typeof whatsapp === 'string' && whatsapp.trim() ? whatsapp.trim() : null,
    placement: input.placement as AdCampaignPlacement,
    startsAt,
    endsAt,
    startsOn: validDate(startsOn) ? startsOn : null,
    endsOn: validDate(endsOn) ? endsOn : null,
    dailyStartTime: typeof dailyStartTime === 'string' && dailyStartTime ? dailyStartTime : null,
    dailyEndTime: typeof dailyEndTime === 'string' && dailyEndTime ? dailyEndTime : null,
    enabled: typeof enabled === 'boolean' ? enabled : true,
    popupEnabled: typeof popupEnabled === 'boolean' ? popupEnabled : false,
    popupPages: Array.isArray(popupPages) ? [...new Set(popupPages)] as (typeof AD_POPUP_PAGES)[number][] : [],
    popupDurationSeconds: typeof popupDurationSeconds === 'number' ? popupDurationSeconds : 0,
    closeDelaySeconds: typeof closeDelaySeconds === 'number' ? closeDelaySeconds : 0,
    frequency: FREQUENCIES.includes(frequency as AdPopupFrequency) ? frequency as AdPopupFrequency : 'SESSION',
    price,
    status: statusAllowed ? status as AdCampaignStatus : 'PENDING',
    contactEmail: typeof email === 'string' && email.trim() ? email.trim() : null,
    contactPhone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
  } satisfies Omit<AdCampaignDocument, '_id' | 'createdAt' | 'updatedAt'>;
}
