import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { getRestaurantSettings, updateRestaurantSettings } from '@/src/models/restaurant-settings';
import { isAdSenseReady, isValidAdvertisementSettings, normalizeAdvertisementSettings } from '@/src/utils/advertisements';

async function authorized(permission: 'settings.view' | 'settings.manage') {
  const user = await getSessionUser();
  return Boolean(user && AuthorizationService.canAccess(user.role, permission, user.permissions));
}

export async function GET() {
  if (!(await authorized('settings.view'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await getRestaurantSettings();
  return NextResponse.json({ success: true, data: normalizeAdvertisementSettings(settings.advertisements) });
}

export async function PUT(request: Request) {
  if (!(await authorized('settings.manage'))) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const payload: unknown = await request.json();
    if (!isValidAdvertisementSettings(payload)) {
      return NextResponse.json({ error: 'Invalid advertisement settings.' }, { status: 400 });
    }
    const settings = normalizeAdvertisementSettings(payload);
    if (settings.adsenseEnabled && !isAdSenseReady(settings)) {
      return NextResponse.json({ error: 'Google AdSense requires confirmed site approval, a configured certified CMP, and an ad unit or Auto ads.' }, { status: 400 });
    }
    const updated = await updateRestaurantSettings({ advertisements: settings });
    return NextResponse.json({ success: true, data: normalizeAdvertisementSettings(updated.advertisements) });
  } catch {
    return NextResponse.json({ error: 'Unable to save advertisement settings.' }, { status: 500 });
  }
}
