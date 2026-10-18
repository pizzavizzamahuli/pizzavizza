import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getAdCampaignsCollection, recordAdEvent } from '@/src/models/advertisement';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { isEligibleAdCampaign, normalizeAdvertisementSettings } from '@/src/utils/advertisements';

const sessionIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid advertisement event.' }, { status: 400 });
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid advertisement event.' }, { status: 400 });
  }
  const body = payload as Record<string, unknown>;
  if (typeof body.campaignId !== 'string' || !ObjectId.isValid(body.campaignId)
    || (body.kind !== 'impression' && body.kind !== 'click')
    || typeof body.sessionId !== 'string' || !sessionIdPattern.test(body.sessionId)) {
    return NextResponse.json({ error: 'Invalid advertisement event.' }, { status: 400 });
  }

  try {
    const [campaign, restaurant] = await Promise.all([
      (await getAdCampaignsCollection()).findOne({ _id: new ObjectId(body.campaignId) }),
      getRestaurantSettings(),
    ]);
    if (!normalizeAdvertisementSettings(restaurant.advertisements).localAdsEnabled
      || !campaign || campaign.enabled === false
      || !isEligibleAdCampaign(campaign, new Date(), restaurant.restaurantTimezone || 'Asia/Kolkata')) {
      return NextResponse.json({ error: 'Campaign is not currently active.' }, { status: 404 });
    }
    const recorded = await recordAdEvent(body.campaignId, body.kind, body.sessionId, new Date(), restaurant.restaurantTimezone || 'Asia/Kolkata');
    return NextResponse.json({ success: true, recorded });
  } catch {
    return NextResponse.json({ error: 'Advertisement measurement is unavailable.' }, { status: 503 });
  }
}
