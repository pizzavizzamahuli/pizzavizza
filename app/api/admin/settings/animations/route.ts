import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { getRestaurantSettings, updateRestaurantSettings } from '@/src/models/restaurant-settings';
import { defaultSiteAnimations, normalizeSiteAnimations, type SiteAnimations } from '@/src/types/site-animations';

const animationKeys = ['enabled', 'brandFloat', 'contentGlow', 'actionPulse', 'foodLoader'] as const;

function isSiteAnimations(value: unknown): value is SiteAnimations {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const settings = value as Record<string, unknown>;
  return animationKeys.every((key) => typeof settings[key] === 'boolean');
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.view', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings = await getRestaurantSettings();
  return NextResponse.json({ success: true, data: normalizeSiteAnimations(settings.siteAnimations) });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = await request.json() as { animations?: unknown };
    if (!isSiteAnimations(payload.animations)) {
      return NextResponse.json({ error: 'Invalid animation settings.' }, { status: 400 });
    }

    const animations = normalizeSiteAnimations(payload.animations);
    const updated = await updateRestaurantSettings({ siteAnimations: animations });
    return NextResponse.json({ success: true, data: normalizeSiteAnimations(updated.siteAnimations) });
  } catch {
    return NextResponse.json({ error: 'Unable to save animation settings.' }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const updated = await updateRestaurantSettings({ siteAnimations: defaultSiteAnimations });
  return NextResponse.json({ success: true, data: normalizeSiteAnimations(updated.siteAnimations) });
}
