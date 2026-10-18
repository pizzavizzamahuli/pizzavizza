import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import {
  getAdCampaignMetrics,
  getAdCampaignsCollection,
  toAdCampaignDto,
} from '@/src/models/advertisement';
import { parseAdCampaign } from '@/src/utils/ad-campaign-validation';
import { effectiveAdCampaignStatus } from '@/src/utils/advertisements';
import { getCloudinaryConfig } from '@/src/utils/cloudinary';

async function authorized(permission: 'settings.view' | 'settings.manage') {
  const user = await getSessionUser();
  return Boolean(user && AuthorizationService.canAccess(user.role, permission, user.permissions));
}

export async function GET() {
  if (!(await authorized('settings.view'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const collection = await getAdCampaignsCollection();
  const settings = await getRestaurantSettings();
  const [campaigns, metrics] = await Promise.all([
    collection.find({}).sort({ createdAt: -1 }).limit(200).toArray(),
    getAdCampaignMetrics(),
  ]);
  return NextResponse.json({
    success: true,
    data: campaigns.map((campaign) => ({
      ...toAdCampaignDto(campaign),
      ...(campaign._id ? metrics[campaign._id.toHexString()] || { impressions: 0, clicks: 0 } : { impressions: 0, clicks: 0 }),
      effectiveStatus: effectiveAdCampaignStatus(campaign, new Date(), settings.restaurantTimezone || 'Asia/Kolkata'),
    })),
  });
}

export async function POST(request: Request) {
  if (!(await authorized('settings.manage'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    if (Number(request.headers.get('content-length') || 0) > 32 * 1024) {
      return NextResponse.json({ error: 'Campaign details are too large.' }, { status: 413 });
    }
    const { cloudName } = await getCloudinaryConfig();
    const campaign = parseAdCampaign(await request.json(), true, cloudName);
    if (!campaign || (campaign.status !== 'DRAFT' && campaign.status !== 'PENDING')) {
      return NextResponse.json({ error: 'Check the campaign details. New campaigns must be saved as draft or submitted for approval.' }, { status: 400 });
    }
    const now = new Date();
    const collection = await getAdCampaignsCollection();
    const result = await collection.insertOne({ ...campaign, createdAt: now, updatedAt: now });
    return NextResponse.json({ success: true, id: result.insertedId.toHexString() }, { status: 201 });
  } catch {
    return NextResponse.json({ error: 'Unable to create campaign.' }, { status: 500 });
  }
}
