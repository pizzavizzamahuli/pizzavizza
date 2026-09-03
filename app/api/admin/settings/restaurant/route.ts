import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { RestaurantSettingsDocument, getRestaurantSettings, updateRestaurantSettings } from '@/src/models/restaurant-settings';
import { generateMapLink } from '@/src/services/map-provider';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.view')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const s = await getRestaurantSettings();
  const mapUrl = typeof s.latitude === 'number' && typeof s.longitude === 'number' ? generateMapLink(s.latitude, s.longitude, s.restaurantName) : s.googleMapsUrl || null;
  // Construct a public settings view that excludes sensitive server-side keys
  const publicSettings = {
    _id: s._id,
    id: s.id,
    restaurantName: s.restaurantName,
    logo: s.logo,
    menuImage: s.menuImage,
    phone: s.phone,
    email: s.email,
    addressLine1: s.addressLine1,
    addressLine2: s.addressLine2,
    landmark: s.landmark,
    city: s.city,
    state: s.state,
    postalCode: s.postalCode,
    country: s.country,
    googleMapsUrl: mapUrl,
    latitude: s.latitude,
    longitude: s.longitude,
    deliveryEnabled: s.deliveryEnabled,
    pickupEnabled: s.pickupEnabled,
    deliveryRadius: s.deliveryRadius,
    deliveryRadiusUnit: s.deliveryRadiusUnit,
    deliveryChargeType: s.deliveryChargeType,
    deliveryChargeValue: s.deliveryChargeValue,
    freeDeliveryEnabled: s.freeDeliveryEnabled,
    freeDeliveryMinimumOrder: s.freeDeliveryMinimumOrder,
    codEnabled: s.codEnabled,
    manualPaymentEnabled: s.manualPaymentEnabled,
    manualPaymentUpiId: s.manualPaymentUpiId,
    manualPaymentQrUrl: s.manualPaymentQrUrl,
    manualPaymentBankDetails: s.manualPaymentBankDetails,
    onlinePaymentEnabled: s.onlinePaymentEnabled,
    deliveryWhatsAppNumber: s.deliveryWhatsAppNumber,
    chatbotEnabled: s.chatbotEnabled ?? true,
    telegramEnabled: s.telegramEnabled,
    telegramOrderNotificationsEnabled: s.telegramOrderNotificationsEnabled,
    telegramBookingNotificationsEnabled: s.telegramBookingNotificationsEnabled,
    telegramPaymentNotificationsEnabled: s.telegramPaymentNotificationsEnabled,
    referralEnabled: s.referralEnabled,
    referralReferrerRewardAmount: s.referralReferrerRewardAmount,
    referralReferredRewardAmount: s.referralReferredRewardAmount,
    referralMinimumOrderAmount: s.referralMinimumOrderAmount,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };

  return NextResponse.json({ success: true, data: publicSettings });
}

export async function PUT(request: Request) {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = await request.json();
    const updates = payload as Record<string, unknown>;
    const sanitizedLat = typeof updates.latitude === 'number' ? updates.latitude : typeof updates.latitude === 'string' ? Number(updates.latitude) : undefined;
    const sanitizedLng = typeof updates.longitude === 'number' ? updates.longitude : typeof updates.longitude === 'string' ? Number(updates.longitude) : undefined;
    const nextMapUrl = typeof sanitizedLat === 'number' && typeof sanitizedLng === 'number' ? generateMapLink(sanitizedLat, sanitizedLng, typeof updates.restaurantName === 'string' ? updates.restaurantName.trim() : undefined) : undefined;

    const sanitized: Partial<RestaurantSettingsDocument> = {
      restaurantName: typeof updates.restaurantName === 'string' ? updates.restaurantName.trim() : undefined,
      logo: typeof updates.logo === 'string' ? updates.logo.trim() : undefined,
      menuImage: typeof updates.menuImage === 'string' ? updates.menuImage.trim() : undefined,
      phone: typeof updates.phone === 'string' ? updates.phone.trim() : undefined,
      email: typeof updates.email === 'string' ? updates.email.trim() : undefined,
      addressLine1: typeof updates.addressLine1 === 'string' ? updates.addressLine1.trim() : undefined,
      addressLine2: typeof updates.addressLine2 === 'string' ? updates.addressLine2.trim() : undefined,
      landmark: typeof updates.landmark === 'string' ? updates.landmark.trim() : undefined,
      city: typeof updates.city === 'string' ? updates.city.trim() : undefined,
      state: typeof updates.state === 'string' ? updates.state.trim() : undefined,
      postalCode: typeof updates.postalCode === 'string' ? updates.postalCode.trim() : undefined,
      country: typeof updates.country === 'string' ? updates.country.trim() : undefined,
      googleMapsUrl: typeof updates.googleMapsUrl === 'string' ? updates.googleMapsUrl.trim() : nextMapUrl,
      latitude: sanitizedLat,
      longitude: sanitizedLng,
      deliveryEnabled: typeof updates.deliveryEnabled === 'boolean' ? updates.deliveryEnabled : undefined,
      pickupEnabled: typeof updates.pickupEnabled === 'boolean' ? updates.pickupEnabled : undefined,
      deliveryRadius: typeof updates.deliveryRadius === 'number' ? updates.deliveryRadius : typeof updates.deliveryRadius === 'string' ? Number(updates.deliveryRadius) : undefined,
      deliveryRadiusUnit: updates.deliveryRadiusUnit === 'MILES' ? 'MILES' : updates.deliveryRadiusUnit === 'KM' ? 'KM' : undefined,
      deliveryChargeType: updates.deliveryChargeType === 'FREE' || updates.deliveryChargeType === 'DISTANCE_BASED' ? updates.deliveryChargeType : updates.deliveryChargeType === 'FIXED' ? 'FIXED' : undefined,
      deliveryChargeValue: typeof updates.deliveryChargeValue === 'number' ? updates.deliveryChargeValue : typeof updates.deliveryChargeValue === 'string' ? Number(updates.deliveryChargeValue) : undefined,
      freeDeliveryEnabled: typeof updates.freeDeliveryEnabled === 'boolean' ? updates.freeDeliveryEnabled : undefined,
      freeDeliveryMinimumOrder: typeof updates.freeDeliveryMinimumOrder === 'number' ? updates.freeDeliveryMinimumOrder : typeof updates.freeDeliveryMinimumOrder === 'string' ? Number(updates.freeDeliveryMinimumOrder) : undefined,
      codEnabled: typeof updates.codEnabled === 'boolean' ? updates.codEnabled : undefined,
      manualPaymentEnabled: typeof updates.manualPaymentEnabled === 'boolean' ? updates.manualPaymentEnabled : undefined,
      manualPaymentUpiId: typeof updates.manualPaymentUpiId === 'string' ? updates.manualPaymentUpiId.trim() : undefined,
      manualPaymentQrUrl: typeof updates.manualPaymentQrUrl === 'string' ? updates.manualPaymentQrUrl.trim() : undefined,
      manualPaymentBankDetails: typeof updates.manualPaymentBankDetails === 'string' ? updates.manualPaymentBankDetails.trim() : undefined,
      onlinePaymentEnabled: typeof updates.onlinePaymentEnabled === 'boolean' ? updates.onlinePaymentEnabled : undefined,
      deliveryWhatsAppNumber: typeof updates.deliveryWhatsAppNumber === 'string' ? updates.deliveryWhatsAppNumber.trim() : undefined,
      chatbotEnabled: typeof updates.chatbotEnabled === 'boolean' ? updates.chatbotEnabled : undefined,
      telegramEnabled: typeof updates.telegramEnabled === 'boolean' ? updates.telegramEnabled : undefined,
      telegramOrderNotificationsEnabled: typeof updates.telegramOrderNotificationsEnabled === 'boolean' ? updates.telegramOrderNotificationsEnabled : undefined,
      telegramBookingNotificationsEnabled: typeof updates.telegramBookingNotificationsEnabled === 'boolean' ? updates.telegramBookingNotificationsEnabled : undefined,
      telegramPaymentNotificationsEnabled: typeof updates.telegramPaymentNotificationsEnabled === 'boolean' ? updates.telegramPaymentNotificationsEnabled : undefined,
      referralEnabled: typeof updates.referralEnabled === 'boolean' ? updates.referralEnabled : undefined,
      referralReferrerRewardAmount: typeof updates.referralReferrerRewardAmount === 'number' ? Math.max(0, updates.referralReferrerRewardAmount) : undefined,
      referralReferredRewardAmount: typeof updates.referralReferredRewardAmount === 'number' ? Math.max(0, updates.referralReferredRewardAmount) : undefined,
      referralMinimumOrderAmount: typeof updates.referralMinimumOrderAmount === 'number' ? Math.max(0, updates.referralMinimumOrderAmount) : undefined,
    };

    const updated = await updateRestaurantSettings(sanitized);
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update restaurant settings';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
