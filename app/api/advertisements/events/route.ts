import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getAdCampaignsCollection, recordAdEvent, type AdEventKind } from '@/src/models/advertisement';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { normalizeAdvertisementSettings } from '@/src/utils/advertisements';

export async function POST(request: Request) {
  const contentLength = Number(request.headers.get('content-length') || 0);
  if (contentLength > 1024) return NextResponse.json({ error: 'Invalid event.' }, { status: 413 });
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  if (!request.headers.get('cookie')?.split(';').some((item) => item.trim() === 'pv_local_ads_consent=accepted')) {
    return NextResponse.json({ error: 'Ad measurement consent is required.' }, { status: 403 });
  }

  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return NextResponse.json({ error: 'Invalid event.' }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    if (typeof input.campaignId !== 'string' || !/^[0-9a-f]{24}$/i.test(input.campaignId)
      || typeof input.sessionId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(input.sessionId)
      || (input.kind !== 'impression' && input.kind !== 'click')) {
      return NextResponse.json({ error: 'Invalid event.' }, { status: 400 });
    }

    const settings = normalizeAdvertisementSettings((await getRestaurantSettings()).advertisements);
    if (!settings.localAdsEnabled) return NextResponse.json({ success: true });
    const campaign = await (await getAdCampaignsCollection()).findOne({
      _id: new ObjectId(input.campaignId),
      status: 'APPROVED',
      startsAt: { $lte: new Date() },
      endsAt: { $gte: new Date() },
    });
    if (!campaign) return NextResponse.json({ success: true });
    await recordAdEvent(input.campaignId, input.kind as AdEventKind, input.sessionId);
    return NextResponse.json({ success: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch {
    return NextResponse.json({ error: 'Unable to record ad measurement.' }, { status: 500 });
  }
}
