import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { RestaurantSettingsDocument, getRestaurantSettings, updateRestaurantSettings } from '@/src/models/restaurant-settings';
import { recordAudit } from '@/src/models/audit-log';
import { encryptSecret } from '@/src/utils/secret-crypto';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.view', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const settings = await getRestaurantSettings();
  return NextResponse.json({
    success: true,
    data: {
      googleMapsServerApiKeySet: !!settings.googleMapsServerApiKey,
      razorpayKeySecretSet: !!settings.razorpayKeySecret,
      telegramBotTokenSet: !!settings.telegramBotToken,
      cloudinaryApiSecretSet: !!settings.cloudinaryApiSecret,
    },
  });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as Record<string, unknown>;
    // Only accept known secret keys; null clears the secret
    const updates: Partial<RestaurantSettingsDocument> = {};
    const keys: Array<{ key: string; field: string }> = [
      { key: 'googleMapsServerApiKey', field: 'googleMapsServerApiKey' },
      { key: 'razorpayKeySecret', field: 'razorpayKeySecret' },
      { key: 'telegramBotToken', field: 'telegramBotToken' },
      { key: 'cloudinaryApiSecret', field: 'cloudinaryApiSecret' },
    ];

    const before = await getRestaurantSettings();

    for (const k of keys) {
      if (Object.prototype.hasOwnProperty.call(payload, k.key)) {
        const v = payload[k.key];
        const val = typeof v === 'string' && v.trim().length > 0 ? v.trim() : null;
        // encrypt secret before persisting
        (updates as unknown as Record<string, unknown>)[k.field] = val ? encryptSecret(val as string) : null;
      }
    }

    const updated = await updateRestaurantSettings(updates);

    // Record audit for sensitive changes
    await recordAudit({
      type: 'STORE_SECRETS_UPDATED',
      performedBy: user._id?.toHexString() ?? user.email ?? 'unknown',
      oldValue: { googleMapsServerApiKey: !!before.googleMapsServerApiKey, razorpayKeySecret: !!before.razorpayKeySecret, telegramBotToken: !!before.telegramBotToken, cloudinaryApiSecret: !!before.cloudinaryApiSecret },
      newValue: { googleMapsServerApiKey: !!updated.googleMapsServerApiKey, razorpayKeySecret: !!updated.razorpayKeySecret, telegramBotToken: !!updated.telegramBotToken, cloudinaryApiSecret: !!updated.cloudinaryApiSecret },
    });

    return NextResponse.json({ success: true, data: { googleMapsServerApiKeySet: !!updated.googleMapsServerApiKey } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update secrets';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
