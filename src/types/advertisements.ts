export const AD_PLACEMENTS = ['HOME', 'MENU', 'PRODUCT', 'CONTENT'] as const;
export type AdPlacement = (typeof AD_PLACEMENTS)[number];

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
  businessName: string;
  imageUrl: string;
  destinationUrl: string;
  placement: AdPlacement;
  startsAt: string;
  endsAt: string;
  price: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PAUSED' | 'REJECTED';
  effectiveStatus?: string;
  contactEmail: string | null;
  contactPhone: string | null;
  impressions?: number;
  clicks?: number;
  createdAt?: string;
  updatedAt?: string;
}
