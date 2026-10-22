import {
  AD_PLACEMENTS,
  ADSTERRA_UNIT_KEYS,
  defaultAdvertisementSettings,
  type AdPlacement,
  type AdPopupFrequency,
  type AdPopupPage,
  type AdvertisementSettings,
  type AdsterraUnitKey,
} from '../types/advertisements';

export { ADSTERRA_UNIT_KEYS };

export interface DatedAdCampaign {
  status: string;
  startsAt: Date;
  endsAt: Date;
  enabled?: boolean;
  startsOn?: string | null;
  endsOn?: string | null;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
}

export function getDateInTimeZone(date: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }
}

function getTimeInTimeZone(date: Date, timeZone: string) {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone,
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  }
}

export function isCampaignWithinSchedule(
  campaign: DatedAdCampaign,
  now = new Date(),
  timeZone = 'Asia/Kolkata',
) {
  const today = getDateInTimeZone(now, timeZone);
  const time = getTimeInTimeZone(now, timeZone);
  const dailyStartTime = campaign.dailyStartTime;
  const dailyEndTime = campaign.dailyEndTime;
  const crossesMidnight = Boolean(dailyStartTime && dailyEndTime && dailyStartTime > dailyEndTime);
  const afterMidnightInWindow = Boolean(crossesMidnight && dailyEndTime && time <= dailyEndTime);
  const scheduleDate = afterMidnightInWindow
    ? new Date(`${today}T00:00:00.000Z`)
    : null;
  if (scheduleDate) scheduleDate.setUTCDate(scheduleDate.getUTCDate() - 1);
  const previousDate = scheduleDate?.toISOString().slice(0, 10);
  const dateIsInRange = (date: string) =>
    (!campaign.startsOn || campaign.startsOn <= date)
    && (!campaign.endsOn || campaign.endsOn >= date);
  const scheduledDate = afterMidnightInWindow ? previousDate : today;
  if ((campaign.startsOn || campaign.endsOn)
    && (!scheduledDate || !dateIsInRange(scheduledDate))) return false;
  if (!campaign.startsOn && campaign.startsAt > now) return false;
  if (!campaign.endsOn && campaign.endsAt < now) return false;

  if (!dailyStartTime || !dailyEndTime) return true;
  return dailyStartTime <= dailyEndTime
    ? time >= dailyStartTime && time <= dailyEndTime
    : time >= dailyStartTime || time <= dailyEndTime;
}

export function isEligibleAdCampaign(
  campaign: DatedAdCampaign,
  now = new Date(),
  timeZone = 'Asia/Kolkata',
) {
  return (campaign.status === 'APPROVED' || campaign.status === 'ACTIVE')
    && campaign.enabled !== false
    && isCampaignWithinSchedule(campaign, now, timeZone);
}

export function effectiveAdCampaignStatus(
  campaign: DatedAdCampaign,
  now = new Date(),
  timeZone = 'Asia/Kolkata',
) {
  if (campaign.status !== 'APPROVED' && campaign.status !== 'ACTIVE') return campaign.status;
  if ('enabled' in campaign && campaign.enabled === false) return 'DISABLED';
  const today = getDateInTimeZone(now, timeZone);
  if ((campaign.endsOn && campaign.endsOn < today) || (!campaign.endsOn && campaign.endsAt < now)) return 'EXPIRED';
  if ((campaign.startsOn && campaign.startsOn > today) || (!campaign.startsOn && campaign.startsAt > now)) return 'SCHEDULED';
  return campaign.status;
}

export function campaignMatchesPopupPage(pages: AdPopupPage[] | undefined, page: AdPopupPage) {
  return Boolean(pages?.includes(page));
}

export function shouldShowPopupForFrequency(
  frequency: AdPopupFrequency | undefined,
  seenToday: boolean,
  seenInSession: boolean,
) {
  if (frequency === 'DAILY') return !seenToday;
  if (frequency === 'EVERY_VISIT') return true;
  return !seenInSession;
}

const publisherPattern = /^ca-pub-\d{16}$/;
const slotPattern = /^\d{4,20}$/;

function normalizeAdsterraSettings(value?: Partial<AdvertisementSettings>['adsterra'] | null): AdvertisementSettings['adsterra'] {
  const base = defaultAdvertisementSettings.adsterra;
  const incoming = (value ?? {}) as Partial<AdvertisementSettings['adsterra']>;
  const incomingUnits = (incoming.units ?? {}) as Partial<Record<AdsterraUnitKey, { enabled?: boolean; placement?: AdPlacement }>>;
  const normalizedUnits = {} as Record<AdsterraUnitKey, { enabled: boolean; placement: AdPlacement }>;

  for (const key of ADSTERRA_UNIT_KEYS) {
    const unit = incomingUnits[key] ?? base.units[key];
    normalizedUnits[key] = {
      enabled: typeof unit?.enabled === 'boolean' ? unit.enabled : false,
      placement: isAdPlacement(unit?.placement) ? unit.placement : base.units[key].placement,
    };
  }

  return {
    enabled: typeof incoming.enabled === 'boolean' ? incoming.enabled : false,
    units: normalizedUnits,
  };
}

export function normalizeAdvertisementSettings(value?: Partial<AdvertisementSettings> | null): AdvertisementSettings {
  const next = {
    ...defaultAdvertisementSettings,
    ...value,
    adsenseSlots: {
      ...defaultAdvertisementSettings.adsenseSlots,
      ...(value?.adsenseSlots || {}),
    },
  } as AdvertisementSettings;
  next.adsterra = normalizeAdsterraSettings(value?.adsterra ?? next.adsterra);
  return next;
}

export function isValidAdvertisementSettings(value: unknown): value is AdvertisementSettings {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const settings = value as Record<string, unknown>;
  const slots = settings.adsenseSlots;
  if (!slots || typeof slots !== 'object' || Array.isArray(slots)) return false;
  const slotSettings = slots as Record<string, unknown>;
  const adsterra = settings.adsterra;
  const validAdsterra = !adsterra || (
    typeof adsterra === 'object'
    && !Array.isArray(adsterra)
    && typeof (adsterra as Record<string, unknown>).enabled === 'boolean'
    && typeof (adsterra as Record<string, unknown>).units === 'object'
    && !Array.isArray((adsterra as Record<string, unknown>).units)
    && ADSTERRA_UNIT_KEYS.every((key) => {
      const unit = (adsterra as Record<string, unknown>).units as Record<string, unknown>;
      return unit && unit[key] && typeof unit[key] === 'object' && !Array.isArray(unit[key])
        && typeof (unit[key] as Record<string, unknown>).enabled === 'boolean'
        && typeof (unit[key] as Record<string, unknown>).placement === 'string'
        && AD_PLACEMENTS.includes((unit[key] as Record<string, unknown>).placement as (typeof AD_PLACEMENTS)[number]);
    })
  );
  return typeof settings.adsenseEnabled === 'boolean'
    && typeof settings.adsenseSiteApproved === 'boolean'
    && typeof settings.adsenseCmpConfigured === 'boolean'
    && typeof settings.adsenseAutoAds === 'boolean'
    && typeof settings.localAdsEnabled === 'boolean'
    && typeof settings.adsensePublisherId === 'string'
    && publisherPattern.test(settings.adsensePublisherId)
    && validAdsterra
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
