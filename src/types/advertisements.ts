export const AD_PLACEMENTS = ['HOME', 'MENU', 'PRODUCT', 'CONTENT'] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];
export type AdCampaignPlacement = AdPlacement | 'NONE';
export const AD_POPUP_PAGES = ['HOME', 'MENU', 'PRODUCT', 'DINING'] as const;
export type AdPopupPage = (typeof AD_POPUP_PAGES)[number];
export type AdPopupFrequency = 'SESSION' | 'DAILY' | 'EVERY_VISIT';

export interface AdSlotSettings {
  HOME: string;
  MENU: string;
  PRODUCT: string;
  CONTENT: string;
}

export interface AdvertisementSettings {
  adsenseEnabled: boolean;
  adsensePublisherId: string;
  adsenseSiteApproved: boolean;
  adsenseCmpConfigured: boolean;
  adsenseAutoAds: boolean;
  adsenseSlots: AdSlotSettings;
  localAdsEnabled: boolean;
}

export const defaultAdvertisementSettings: AdvertisementSettings = {
  adsenseEnabled: false,
  adsensePublisherId: 'ca-pub-9052453172321926',
  adsenseSiteApproved: false,
  adsenseCmpConfigured: false,
  adsenseAutoAds: false,
  adsenseSlots: { HOME: '', MENU: '', PRODUCT: '', CONTENT: '' },
  localAdsEnabled: false,
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
