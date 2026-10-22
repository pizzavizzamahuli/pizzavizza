import { NextResponse } from 'next/server';
import { getAdCampaignsCollection } from '@/src/models/advertisement';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import {
  ADSTERRA_UNIT_KEYS,
  isAdSenseReady,
  isEligibleAdCampaign,
  isAdPlacement,
  normalizeAdvertisementSettings,
} from '@/src/utils/advertisements';
import type { AdsterraUnitKey } from '@/src/types/advertisements';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const placement = new URL(request.url).searchParams.get('placement');
  if (!isAdPlacement(placement)) return NextResponse.json({ error: 'Invalid placement.' }, { status: 400 });

  let restaurant;
  try {
    restaurant = await getRestaurantSettings();
  } catch {
    return NextResponse.json({ error: 'Advertisement settings are unavailable.' }, { status: 503 });
  }
  const settings = normalizeAdvertisementSettings(restaurant.advertisements);
  const timeZone = restaurant.restaurantTimezone || 'Asia/Kolkata';
  const campaigns = settings.localAdsEnabled
    ? (await (await getAdCampaignsCollection()).find({
      status: { $in: ['APPROVED', 'ACTIVE'] },
      placement,
    }).sort({ createdAt: -1 }).limit(100).toArray())
      .filter((campaign) => campaign.enabled !== false && isEligibleAdCampaign(campaign, new Date(), timeZone))
      .slice(0, 3)
    : [];
  const slot = settings.adsenseSlots[placement];
  const adsense = isAdSenseReady(settings) && (settings.adsenseAutoAds || Boolean(slot))
    ? {
      publisherId: settings.adsensePublisherId,
      autoAds: settings.adsenseAutoAds,
      slot: slot || null,
    }
    : null;

  const adsterra = settings.adsterra;
  const activeAdsterraUnits = (ADSTERRA_UNIT_KEYS as readonly AdsterraUnitKey[])
    .filter((key: AdsterraUnitKey) => adsterra.enabled && adsterra.units[key].enabled && adsterra.units[key].placement === placement)
    .map((key: AdsterraUnitKey) => ({
      key,
      config: adsterra.units[key],
    }));

  return NextResponse.json({
    success: true,
    data: {
      localAdsEnabled: settings.localAdsEnabled,
      campaigns: campaigns.map((campaign) => ({
        _id: campaign._id?.toHexString(),
        businessName: campaign.businessName,
        title: campaign.title || campaign.businessName,
        imageUrl: campaign.imageUrl,
        description: campaign.description || null,
        destinationUrl: campaign.destinationUrl,
        contactWhatsApp: campaign.contactWhatsApp || null,
        placement: campaign.placement,
      })),
      adsense,
      adsterra: {
        enabled: adsterra.enabled,
        units: activeAdsterraUnits,
      },
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
