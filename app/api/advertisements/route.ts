import { NextResponse } from 'next/server';
import { getAdCampaignsCollection } from '@/src/models/advertisement';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { isAdSenseReady, normalizeAdvertisementSettings, isAdPlacement } from '@/src/utils/advertisements';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const placement = new URL(request.url).searchParams.get('placement');
  if (!isAdPlacement(placement)) return NextResponse.json({ error: 'Invalid placement.' }, { status: 400 });

  let settings;
  try {
    settings = normalizeAdvertisementSettings((await getRestaurantSettings()).advertisements);
  } catch {
    return NextResponse.json({ error: 'Advertisement settings are unavailable.' }, { status: 503 });
  }
  const consentCookie = request.headers.get('cookie')?.split(';').map((item) => item.trim().split('=')) ?? [];
  const consentValue = consentCookie.find(([name]) => name === 'pv_local_ads_consent')?.[1];
  const consent = consentValue === 'accepted';
  const campaigns = settings.localAdsEnabled && consent
    ? await (await getAdCampaignsCollection()).find({
      status: 'APPROVED',
      placement,
      startsAt: { $lte: new Date() },
      endsAt: { $gte: new Date() },
    }).sort({ createdAt: -1 }).limit(3).toArray()
    : [];
  const slot = settings.adsenseSlots[placement];
  const adsense = isAdSenseReady(settings) && (settings.adsenseAutoAds || Boolean(slot))
    ? {
      publisherId: settings.adsensePublisherId,
      autoAds: settings.adsenseAutoAds,
      slot: slot || null,
    }
    : null;

  return NextResponse.json({
    success: true,
    data: {
      localAdsEnabled: settings.localAdsEnabled,
      localAdsConsent: consent,
      localAdsChoice: consentValue === 'accepted' || consentValue === 'rejected' ? consentValue : null,
      campaigns: campaigns.map((campaign) => ({
        _id: campaign._id?.toHexString(),
        businessName: campaign.businessName,
        imageUrl: campaign.imageUrl,
        destinationUrl: campaign.destinationUrl,
        placement: campaign.placement,
      })),
      adsense,
    },
  }, { headers: { 'Cache-Control': 'private, no-store' } });
}
