export const AD_PLACEMENTS = ['HOME', 'MENU', 'PRODUCT', 'CONTENT'] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];
export type AdCampaignPlacement = AdPlacement | 'NONE';
export const AD_POPUP_PAGES = ['HOME', 'MENU', 'PRODUCT', 'DINING'] as const;
export type AdPopupPage = (typeof AD_POPUP_PAGES)[number];
export type AdPopupFrequency = 'SESSION' | 'DAILY' | 'EVERY_VISIT';

export const ADSTERRA_UNIT_KEYS = [
  'nativeBanner',
  'popunder',
  'smartlink',
  'socialBar',
  'banner300x250',
  'banner160x300',
  'banner468x60',
  'banner160x600',
  'banner320x50',
  'banner728x90',
] as const;
export type AdsterraUnitKey = (typeof ADSTERRA_UNIT_KEYS)[number];

export interface AdSlotSettings {
  HOME: string;
  MENU: string;
  PRODUCT: string;
  CONTENT: string;
}

export interface AdsterraUnitSettings {
  enabled: boolean;
  placement: AdPlacement;
}

export interface AdsterraSettings {
  enabled: boolean;
  units: Record<AdsterraUnitKey, AdsterraUnitSettings>;
}

export interface AdvertisementSettings {
  adsenseEnabled: boolean;
  adsensePublisherId: string;
  adsenseSiteApproved: boolean;
  adsenseCmpConfigured: boolean;
  adsenseAutoAds: boolean;
  adsenseSlots: AdSlotSettings;
  localAdsEnabled: boolean;
  adsterra: AdsterraSettings;
}

export const defaultAdvertisementSettings: AdvertisementSettings = {
  adsenseEnabled: false,
  adsensePublisherId: 'ca-pub-9052453172321926',
  adsenseSiteApproved: false,
  adsenseCmpConfigured: false,
  adsenseAutoAds: false,
  adsenseSlots: { HOME: '', MENU: '', PRODUCT: '', CONTENT: '' },
  localAdsEnabled: false,
  adsterra: {
    enabled: false,
    units: {
      nativeBanner: { enabled: false, placement: 'HOME' },
      popunder: { enabled: false, placement: 'HOME' },
      smartlink: { enabled: false, placement: 'CONTENT' },
      socialBar: { enabled: false, placement: 'CONTENT' },
      'banner300x250': { enabled: false, placement: 'HOME' },
      'banner160x300': { enabled: false, placement: 'PRODUCT' },
      'banner468x60': { enabled: false, placement: 'HOME' },
      'banner160x600': { enabled: false, placement: 'CONTENT' },
      'banner320x50': { enabled: false, placement: 'HOME' },
      'banner728x90': { enabled: false, placement: 'HOME' },
    },
  },
};

export interface LocalAdCampaign {
  _id?: string;
  title?: string;
  businessName: string;
  imageUrl: string;
  description?: string | null;
  destinationUrl: string;
  contactWhatsApp?: string | null;
  placement: AdCampaignPlacement;
  startsAt: string;
  endsAt: string;
  startsOn?: string | null;
  endsOn?: string | null;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
  enabled?: boolean;
  popupEnabled?: boolean;
  popupFullScreen?: boolean;
  popupPages?: AdPopupPage[];
  popupDurationSeconds?: number;
  closeDelaySeconds?: number;
  frequency?: AdPopupFrequency;
  price: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'ACTIVE' | 'PAUSED' | 'REJECTED';
  effectiveStatus?: string;
  contactEmail: string | null;
  contactPhone: string | null;
  impressions?: number;
  clicks?: number;
  createdAt?: string;
  updatedAt?: string;
}
