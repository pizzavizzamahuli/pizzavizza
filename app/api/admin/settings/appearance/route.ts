import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { getRestaurantSettings, updateRestaurantSettings } from '@/src/models/restaurant-settings';
import { defaultWebsiteAppearance, mergeWebsiteAppearance, type WebsiteAppearance } from '@/src/types/appearance';
import { recordAudit } from '@/src/models/audit-log';

const hex = /^#[0-9a-f]{6}$/i;

function validAppearance(input: unknown): input is Partial<WebsiteAppearance> {
  if (!input || typeof input !== 'object') return false;
  const appearance = input as Partial<WebsiteAppearance>;
  if (appearance.colors && (!Object.values(appearance.colors).every((value) => typeof value === 'string' && hex.test(value)))) return false;
  if (appearance.preset !== undefined && !['default', 'warm', 'dark', 'elegant', 'minimal', 'custom'].includes(appearance.preset)) return false;
  if (appearance.radius !== undefined && !['sharp', 'soft', 'rounded', 'extra-rounded'].includes(appearance.radius)) return false;
  if (appearance.shadow !== undefined && !['none', 'subtle', 'medium', 'strong'].includes(appearance.shadow)) return false;
  if (appearance.typography?.fontFamily !== undefined && !['system', 'serif', 'modern'].includes(appearance.typography.fontFamily)) return false;
  if (appearance.typography?.headingWeight !== undefined && ![600, 700, 800].includes(appearance.typography.headingWeight)) return false;
  if (appearance.header?.height !== undefined && !['compact', 'comfortable'].includes(appearance.header.height)) return false;
  if (appearance.header?.logoSize !== undefined && !['small', 'medium', 'large'].includes(appearance.header.logoSize)) return false;
  if (appearance.footer?.spacing !== undefined && !['compact', 'comfortable'].includes(appearance.footer.spacing)) return false;
  if (appearance.footer?.logoSize !== undefined && !['small', 'medium', 'large'].includes(appearance.footer.logoSize)) return false;
  if (appearance.typography?.baseFontSize !== undefined && (typeof appearance.typography.baseFontSize !== 'number' || appearance.typography.baseFontSize < 14 || appearance.typography.baseFontSize > 20)) return false;
  return true;
}

function isAllowed(user: { role: string; permissions?: string[] }, permission: 'view' | 'edit') {
  return AuthorizationService.canAccess(user.role, permission === 'view' ? 'settings.view' : 'settings.manage', user.permissions);
}

export async function GET() {
  const user = await getSessionUser();
  if (!user || !isAllowed(user, 'view')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await getRestaurantSettings();
  return NextResponse.json({ success: true, data: mergeWebsiteAppearance(settings.appearance) });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user || !isAllowed(user, 'edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  try {
    const payload = await request.json() as { appearance?: unknown };
    if (!validAppearance(payload.appearance)) return NextResponse.json({ error: 'Invalid appearance configuration.' }, { status: 400 });
    const settings = await getRestaurantSettings();
    const before = mergeWebsiteAppearance(settings.appearance);
    const after = mergeWebsiteAppearance(payload.appearance);
    const updated = await updateRestaurantSettings({ appearance: after });
    await recordAudit({ type: 'WEBSITE_THEME_PUBLISHED', performedBy: user._id?.toHexString() || user.id || null, performedByRole: user.role, oldValue: before, newValue: after });
    return NextResponse.json({ success: true, data: updated.appearance });
  } catch {
    return NextResponse.json({ error: 'Unable to publish website appearance.' }, { status: 500 });
  }
}

export async function DELETE() {
  const user = await getSessionUser();
  if (!user || !isAllowed(user, 'edit')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await getRestaurantSettings();
  const before = mergeWebsiteAppearance(settings.appearance);
  const updated = await updateRestaurantSettings({ appearance: defaultWebsiteAppearance });
  await recordAudit({ type: 'WEBSITE_THEME_RESET_TO_DEFAULT', performedBy: user._id?.toHexString() || user.id || null, performedByRole: user.role, oldValue: before, newValue: defaultWebsiteAppearance });
  return NextResponse.json({ success: true, data: updated.appearance });
}
