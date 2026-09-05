import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { AuthorizationService } from '@/src/config/permissions';
import { RestaurantSettingsDocument, getRestaurantSettings, updateRestaurantSettings } from '@/src/models/restaurant-settings';
import { generateMapLink } from '@/src/services/map-provider';
import { recordAudit } from '@/src/models/audit-log';

export async function GET() {
  const user = await getSessionUser();
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.view', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const s = await getRestaurantSettings();
  const { getUsersCollection } = await import('@/src/models/user');
  const deliveryStaff = await (await getUsersCollection()).find({ role: 'DELIVERY_STAFF', accountStatus: 'ACTIVE' }).project({ passwordHash: 0, passwordReset: 0 }).toArray();
  const mapUrl = typeof s.latitude === 'number' && typeof s.longitude === 'number' ? generateMapLink(s.latitude, s.longitude, s.restaurantName) : s.googleMapsUrl || null;
  // Construct a public settings view that excludes sensitive server-side keys
  const publicSettings = {
    _id: s._id,
    id: s.id,
    restaurantName: s.restaurantName,
    logo: s.logo,
    ...(user.role === 'MAIN_ADMIN' ? { poweredByName: s.poweredByName || null, poweredByUrl: s.poweredByUrl || null } : {}),
    menuImage: s.menuImage,
    phone: s.phone,
    email: s.email,
    supportEmail: s.supportEmail || null,
    whatsappSupportNumber: s.whatsappSupportNumber || null,
    workingHours: s.workingHours || null,
    deliveryAssignmentMode: s.deliveryAssignmentMode,
    deliveryAssignmentStrategy: s.deliveryAssignmentStrategy,
    deliveryAssignmentEligibleStaffIds: s.deliveryAssignmentEligibleStaffIds || [],
    deliveryStaff: deliveryStaff.map((staff) => ({ id: staff._id?.toHexString() || staff.id, name: staff.name, status: staff.staffStatus || 'AVAILABLE' })),
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
    deliveryBaseDistance: s.deliveryBaseDistance,
    deliveryBaseCharge: s.deliveryBaseCharge,
    deliveryAdditionalChargePerKm: s.deliveryAdditionalChargePerKm,
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
  if (!user || !AuthorizationService.canAccess(user.role, 'settings.manage', user.permissions)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const payload = await request.json();
    const updates = payload as Record<string, unknown>;
    const isMainAdmin = user.role === 'MAIN_ADMIN';
    const hasPoweredByUpdate = Object.prototype.hasOwnProperty.call(updates, 'poweredByName') || Object.prototype.hasOwnProperty.call(updates, 'poweredByUrl');
    if (hasPoweredByUpdate && !isMainAdmin) {
      return NextResponse.json({ error: 'Only the Main Admin can update Powered By settings.' }, { status: 403 });
    }
    const poweredByName = typeof updates.poweredByName === 'string' ? updates.poweredByName.trim() : updates.poweredByName === null ? null : undefined;
    const poweredByUrl = typeof updates.poweredByUrl === 'string' ? updates.poweredByUrl.trim() : updates.poweredByUrl === null ? null : undefined;
    const supportEmailValue = typeof updates.supportEmail === 'string' ? updates.supportEmail.trim().toLowerCase() : updates.supportEmail === null ? null : undefined;
    const supportEmail = supportEmailValue === '' ? null : supportEmailValue;
    const whatsappSupportValue = typeof updates.whatsappSupportNumber === 'string' ? updates.whatsappSupportNumber.trim() : updates.whatsappSupportNumber === null ? null : undefined;
    const whatsappSupportNumber = whatsappSupportValue === '' ? null : whatsappSupportValue;
    const workingHoursValue = typeof updates.workingHours === 'string' ? updates.workingHours.trim().slice(0, 200) : updates.workingHours === null ? null : undefined;
    const workingHours = workingHoursValue === '' ? null : workingHoursValue;
    const deliveryAssignmentMode = ['MANUAL', 'AUTOMATIC', 'MANUAL_FALLBACK'].includes(String(updates.deliveryAssignmentMode)) ? updates.deliveryAssignmentMode as RestaurantSettingsDocument['deliveryAssignmentMode'] : undefined;
    const deliveryAssignmentStrategy = ['LOWEST_WORKLOAD', 'ROUND_ROBIN', 'LEAST_RECENT'].includes(String(updates.deliveryAssignmentStrategy)) ? updates.deliveryAssignmentStrategy as RestaurantSettingsDocument['deliveryAssignmentStrategy'] : undefined;
    const deliveryAssignmentEligibleStaffIds = Array.isArray(updates.deliveryAssignmentEligibleStaffIds) ? updates.deliveryAssignmentEligibleStaffIds.filter((id): id is string => typeof id === 'string').slice(0, 100) : undefined;
    if (isMainAdmin && typeof poweredByName === 'string' && (poweredByName.length > 100 || /[<>]/.test(poweredByName))) {
      return NextResponse.json({ error: 'Powered By name must be plain text up to 100 characters.' }, { status: 400 });
    }
    if (isMainAdmin && poweredByUrl) {
      try {
        const parsedUrl = new URL(poweredByUrl);
        if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Invalid protocol');
      } catch {
        return NextResponse.json({ error: 'Powered By URL must be a valid HTTP or HTTPS URL.' }, { status: 400 });
      }
    }
    if (supportEmail !== undefined && supportEmail !== null && !/^\S+@\S+\.\S+$/.test(supportEmail)) {
      return NextResponse.json({ error: 'Help & Support email must be valid.' }, { status: 400 });
    }
    const normalizedWhatsApp = whatsappSupportNumber === null ? null : whatsappSupportNumber?.replace(/\D/g, '');
    if (normalizedWhatsApp && (normalizedWhatsApp.length < 8 || normalizedWhatsApp.length > 15)) {
      return NextResponse.json({ error: 'WhatsApp number must contain 8 to 15 digits.' }, { status: 400 });
    }
    const sanitizedLat = typeof updates.latitude === 'number' ? updates.latitude : typeof updates.latitude === 'string' ? Number(updates.latitude) : undefined;
    const sanitizedLng = typeof updates.longitude === 'number' ? updates.longitude : typeof updates.longitude === 'string' ? Number(updates.longitude) : undefined;
    const nextMapUrl = typeof sanitizedLat === 'number' && typeof sanitizedLng === 'number' ? generateMapLink(sanitizedLat, sanitizedLng, typeof updates.restaurantName === 'string' ? updates.restaurantName.trim() : undefined) : undefined;

    const sanitized: Partial<RestaurantSettingsDocument> = {
      restaurantName: typeof updates.restaurantName === 'string' ? updates.restaurantName.trim() : undefined,
      logo: typeof updates.logo === 'string' ? updates.logo.trim() : undefined,
      ...(isMainAdmin ? { poweredByName, poweredByUrl } : {}),
      menuImage: typeof updates.menuImage === 'string' ? updates.menuImage.trim() : undefined,
      phone: typeof updates.phone === 'string' ? updates.phone.trim() : undefined,
      email: typeof updates.email === 'string' ? updates.email.trim() : undefined,
      supportEmail,
      whatsappSupportNumber: normalizedWhatsApp,
      workingHours,
      deliveryAssignmentMode,
      deliveryAssignmentStrategy,
      deliveryAssignmentEligibleStaffIds,
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
      deliveryBaseDistance: typeof updates.deliveryBaseDistance === 'number' ? Math.max(0, updates.deliveryBaseDistance) : undefined,
      deliveryBaseCharge: typeof updates.deliveryBaseCharge === 'number' ? Math.max(0, updates.deliveryBaseCharge) : undefined,
      deliveryAdditionalChargePerKm: typeof updates.deliveryAdditionalChargePerKm === 'number' ? Math.max(0, updates.deliveryAdditionalChargePerKm) : undefined,
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

    const before = await getRestaurantSettings();
    const updated = await updateRestaurantSettings(sanitized);
    if (sanitized.supportEmail !== undefined && sanitized.supportEmail !== before.supportEmail) {
      await recordAudit({ type: 'SUPPORT_EMAIL_UPDATED', performedBy: user._id?.toHexString() || user.id || null, performedByRole: user.role, oldValue: before.supportEmail || null, newValue: sanitized.supportEmail || null });
    }
    if (sanitized.whatsappSupportNumber !== undefined && sanitized.whatsappSupportNumber !== before.whatsappSupportNumber) {
      await recordAudit({ type: 'WHATSAPP_SUPPORT_NUMBER_UPDATED', performedBy: user._id?.toHexString() || user.id || null, performedByRole: user.role, oldValue: before.whatsappSupportNumber || null, newValue: sanitized.whatsappSupportNumber || null });
    }
    if (isMainAdmin && (sanitized.poweredByName !== undefined || sanitized.poweredByUrl !== undefined) && (before.poweredByName !== sanitized.poweredByName || before.poweredByUrl !== sanitized.poweredByUrl)) {
      await recordAudit({ type: 'POWERED_BY_UPDATED', performedBy: user._id?.toHexString() || user.id || null, performedByRole: user.role, oldValue: { name: before.poweredByName || null, url: before.poweredByUrl || null }, newValue: { name: sanitized.poweredByName ?? before.poweredByName ?? null, url: sanitized.poweredByUrl ?? before.poweredByUrl ?? null } });
    }
    if (typeof sanitized.referralEnabled === 'boolean' && sanitized.referralEnabled !== before.referralEnabled) {
      await recordAudit({ type: sanitized.referralEnabled ? 'REFERRAL_SYSTEM_ENABLED' : 'REFERRAL_SYSTEM_DISABLED', performedBy: user._id?.toHexString() || user.id || null, performedByRole: user.role, oldValue: before.referralEnabled, newValue: sanitized.referralEnabled });
    }
    return NextResponse.json({ success: true, data: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update restaurant settings';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
