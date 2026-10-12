import type { AdCampaignDocument, AdCampaignStatus } from '../models/advertisement';
import { isAdPlacement, isSafeAdvertisementUrl } from './advertisements';

export function parseAdCampaign(value: unknown, statusAllowed: boolean, cloudName: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const input = value as Record<string, unknown>;
  const startsAt = typeof input.startsAt === 'string' ? new Date(input.startsAt) : new Date(NaN);
  const endsAt = typeof input.endsAt === 'string' ? new Date(input.endsAt) : new Date(NaN);
  const imageUrl = typeof input.imageUrl === 'string' ? input.imageUrl : '';
  let parsedImage: URL | null = null;
  try { parsedImage = new URL(imageUrl); } catch { /* rejected below */ }
  const status = input.status;
  const price = input.price;
  const email = input.contactEmail;
  const phone = input.contactPhone;
  const expectedImagePath = `/${cloudName}/image/upload/`;
  if (typeof input.businessName !== 'string' || !input.businessName.trim() || input.businessName.trim().length > 100
    || !parsedImage || parsedImage.protocol !== 'https:' || parsedImage.hostname !== 'res.cloudinary.com'
    || !parsedImage.pathname.startsWith(expectedImagePath) || imageUrl.length > 2048
    || !isSafeAdvertisementUrl(input.destinationUrl)
    || !isAdPlacement(input.placement)
    || typeof input.startsAt !== 'string' || input.startsAt.length > 40
    || typeof input.endsAt !== 'string' || input.endsAt.length > 40
    || !Number.isFinite(startsAt.getTime()) || !Number.isFinite(endsAt.getTime()) || endsAt <= startsAt
    || typeof price !== 'number' || !Number.isFinite(price) || price < 0 || price > 100_000_000
    || (email !== null && email !== undefined && (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    || (phone !== null && phone !== undefined && (typeof phone !== 'string' || phone.length > 32 || !/^[+()\d .-]*$/.test(phone)))
    || (statusAllowed && !['DRAFT', 'PENDING', 'APPROVED', 'PAUSED', 'REJECTED'].includes(status as AdCampaignStatus))) return null;

  return {
    businessName: input.businessName.trim(),
    imageUrl,
    destinationUrl: input.destinationUrl,
    placement: input.placement,
    startsAt,
    endsAt,
    price,
    status: statusAllowed ? status as AdCampaignStatus : 'PENDING',
    contactEmail: typeof email === 'string' && email.trim() ? email.trim() : null,
    contactPhone: typeof phone === 'string' && phone.trim() ? phone.trim() : null,
  } satisfies Omit<AdCampaignDocument, '_id' | 'createdAt' | 'updatedAt'>;
}
