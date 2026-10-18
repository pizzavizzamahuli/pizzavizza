import { NextResponse } from 'next/server';
import { getAdCampaignsCollection, toAdCampaignDto } from '@/src/models/advertisement';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { getDateInTimeZone, isEligibleAdCampaign, normalizeAdvertisementSettings } from '@/src/utils/advertisements';
import { AD_POPUP_PAGES, type AdPopupPage } from '@/src/types/advertisements';

export const dynamic = 'force-dynamic';

function isPopupPage(value: string | null): value is AdPopupPage {
  return value !== null && AD_POPUP_PAGES.includes(value as AdPopupPage);
}

export async function GET(request: Request) {
  const page = new URL(request.url).searchParams.get('page');
  if (!isPopupPage(page)) return NextResponse.json({ error: 'Invalid page.' }, { status: 400 });

  try {
    const settings = await getRestaurantSettings();
    if (!normalizeAdvertisementSettings(settings.advertisements).localAdsEnabled) {
      return NextResponse.json({ success: true, data: { campaigns: [], today: getDateInTimeZone(new Date(), settings.restaurantTimezone || 'Asia/Kolkata') } }, { headers: { 'Cache-Control': 'private, no-store' } });
    }
    const timeZone = settings.restaurantTimezone || 'Asia/Kolkata';
    const now = new Date();
    const campaigns = await (await getAdCampaignsCollection()).find({
      status: { $in: ['APPROVED', 'ACTIVE'] },
      popupEnabled: true,
      popupPages: page,
    }).sort({ createdAt: -1 }).limit(100).toArray();
    const activeCampaigns = campaigns
      .filter((campaign) => campaign.enabled !== false && isEligibleAdCampaign(campaign, now, timeZone))
      .map(toAdCampaignDto);

    return NextResponse.json({
      success: true,
      data: {
        campaigns: activeCampaigns,
        today: getDateInTimeZone(now, timeZone),
      },
    }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch {
    return NextResponse.json({ error: 'Local advertisement campaigns are unavailable.' }, { status: 503 });
  }
}
