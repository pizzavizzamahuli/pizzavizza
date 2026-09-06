import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { getRestaurantSettings, updateRestaurantSettings } from '@/src/models/restaurant-settings';
import { getRestaurantAvailability } from '@/src/services/restaurant-availability';
import { recordAudit } from '@/src/models/audit-log';
import { revalidatePath } from 'next/cache';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'restaurant.view', user.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const settings = await getRestaurantSettings();
  return NextResponse.json({ success: true, data: { availability: getRestaurantAvailability(settings), manualAvailabilityOverride: settings.manualAvailabilityOverride || null, manualAvailabilityReason: settings.manualAvailabilityReason || null } });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'restaurant.manage', user.permissions)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const payload = await request.json() as { override?: 'OPEN' | 'CLOSED' | null; reason?: string | null };
  if (payload.override !== 'OPEN' && payload.override !== 'CLOSED' && payload.override !== null) return NextResponse.json({ error: 'Invalid availability override' }, { status: 400 });
  const before = await getRestaurantSettings();
  const updated = await updateRestaurantSettings({ manualAvailabilityOverride: payload.override, manualAvailabilityReason: typeof payload.reason === 'string' ? payload.reason.trim().slice(0, 200) || null : null, manualAvailabilityChangedAt: new Date(), manualAvailabilityChangedBy: user._id?.toHexString() || user.email });
  await recordAudit({ type: payload.override === 'CLOSED' ? 'RESTAURANT_CLOSED' : payload.override === 'OPEN' ? 'RESTAURANT_OPENED' : 'RESTAURANT_AVAILABILITY_RESET', performedBy: user._id?.toHexString() || user.email || 'unknown', performedByRole: user.role, oldValue: { override: before.manualAvailabilityOverride || null }, newValue: { override: payload.override, reason: payload.reason || null }, timestamp: new Date() });
  revalidatePath('/');
  revalidatePath('/admin');
  return NextResponse.json({ success: true, data: { availability: getRestaurantAvailability(updated), manualAvailabilityOverride: updated.manualAvailabilityOverride || null, manualAvailabilityReason: updated.manualAvailabilityReason || null } });
}