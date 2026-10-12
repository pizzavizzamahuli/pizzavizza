import {
  AD_PLACEMENTS,
  defaultAdvertisementSettings,
  type AdvertisementSettings,
} from '../types/advertisements';

export interface DatedAdCampaign {
  status: string;
  startsAt: Date;
  endsAt: Date;
}

export function isEligibleAdCampaign(campaign: DatedAdCampaign, now = new Date()) {
  return campaign.status === 'APPROVED' && campaign.startsAt <= now && campaign.endsAt >= now;
}

export function effectiveAdCampaignStatus(campaign: DatedAdCampaign, now = new Date()) {
  if (campaign.status !== 'APPROVED') return campaign.status;
  if (campaign.endsAt < now) return 'EXPIRED';
  if (campaign.startsAt > now) return 'SCHEDULED';
  return 'APPROVED';
}

const publisherPattern = /^ca-pub-\d{16}$/;
const slotPattern = /^\d{4,20}$/;

export function normalizeAdvertisementSettings(value?: Partial<AdvertisementSettings> | null): AdvertisementSettings {
  return {
    ...defaultAdvertisementSettings,
    ...value,
    adsenseSlots: {
      ...defaultAdvertisementSettings.adsenseSlots,
      ...(value?.adsenseSlots || {}),
    },
  };
}

export function isValidAdvertisementSettings(value: unknown): value is AdvertisementSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const settings = value as Record<string, unknown>;
  const slots = settings.adsenseSlots;
  if (!slots || typeof slots !== 'object' || Array.isArray(slots)) return false;
  const slotSettings = slots as Record<string, unknown>;
  return typeof settings.adsenseEnabled === 'boolean'
    && typeof settings.adsenseSiteApproved === 'boolean'
    && typeof settings.adsenseCmpConfigured === 'boolean'
    && typeof settings.adsenseAutoAds === 'boolean'
    && typeof settings.localAdsEnabled === 'boolean'
    && typeof settings.adsensePublisherId === 'string'
    && publisherPattern.test(settings.adsensePublisherId)
    && AD_PLACEMENTS.every((placement) =>
      typeof slotSettings[placement] === 'string'
      && (slotSettings[placement] === '' || slotPattern.test(slotSettings[placement] as string)),
    );
}

export function isAdSenseReady(settings: AdvertisementSettings) {
  const hasConfiguredUnit = AD_PLACEMENTS.some((placement) => Boolean(settings.adsenseSlots[placement]));
  return settings.adsenseEnabled
    && settings.adsenseSiteApproved
    && settings.adsenseCmpConfigured
    && publisherPattern.test(settings.adsensePublisherId)
    && (settings.adsenseAutoAds || hasConfiguredUnit);
}

export function isSafeAdvertisementUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length > 2048) return false;
  try {
    const url = new URL(value);
    return url.protocol === 'https:'
      && Boolean(url.hostname)
      && !url.username
      && !url.password
      && !['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function isAdPlacement(value: unknown): value is (typeof AD_PLACEMENTS)[number] {
  return typeof value === 'string' && AD_PLACEMENTS.includes(value as (typeof AD_PLACEMENTS)[number]);
}
