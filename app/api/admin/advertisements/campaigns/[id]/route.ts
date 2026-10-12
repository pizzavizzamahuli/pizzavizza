import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { getAdCampaignsCollection } from '@/src/models/advertisement';
import { parseAdCampaign } from '@/src/utils/ad-campaign-validation';
import { getCloudinaryConfig } from '@/src/utils/cloudinary';

async function authorized(permission: 'settings.view' | 'settings.manage') {
  const user = await getSessionUser();
  return Boolean(user && AuthorizationService.canAccess(user.role, permission, user.permissions));
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorized('settings.manage'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  try {
    if (Number(request.headers.get('content-length') || 0) > 32 * 1024) {
      return NextResponse.json({ error: 'Campaign details are too large.' }, { status: 413 });
    }
    const { cloudName } = await getCloudinaryConfig();
    const campaign = parseAdCampaign(await request.json(), true, cloudName);
    if (!campaign) return NextResponse.json({ error: 'Invalid campaign details or status.' }, { status: 400 });
    const collection = await getAdCampaignsCollection();
    const result = await collection.updateOne({ _id: new ObjectId(id) }, { $set: { ...campaign, updatedAt: new Date() } });
    if (!result.matchedCount) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unable to update campaign.' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await authorized('settings.manage'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const { id } = await params;
  if (!ObjectId.isValid(id)) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
  try {
    const result = await (await getAdCampaignsCollection()).deleteOne({ _id: new ObjectId(id) });
    if (!result.deletedCount) return NextResponse.json({ error: 'Campaign not found.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Unable to delete campaign.' }, { status: 500 });
  }
}
