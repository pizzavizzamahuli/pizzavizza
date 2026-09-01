import { AddressDocument } from '@/src/models/address';
import { RestaurantSettingsDocument } from '@/src/models/restaurant-settings';
import { OrderDocument } from '@/src/models/order';

export type DistanceUnit = 'KM' | 'MILES';
export type DeliveryChargeType = 'FREE' | 'FIXED' | 'DISTANCE_BASED';

export type DeliveryEligibilityReason =
  | 'DELIVERY_DISABLED'
  | 'PICKUP_DISABLED'
  | 'MISSING_LOCATION'
  | 'OUTSIDE_RADIUS'
  | 'API_UNAVAILABLE'
  | 'ELIGIBLE';

export interface DeliveryEligibilityResult {
  eligible: boolean;
  reason: DeliveryEligibilityReason;
  reasonMessage: string;
  distance?: number | null;
  radius?: number | null;
  unit: DistanceUnit;
  deliveryCharge: number;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function kmToMiles(km: number) {
  return km * 0.621371;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export function generateGoogleMapsUrl(latitude: number, longitude: number, label?: string) {
  return generateMapLink(latitude, longitude, label);
}

export function generateMapLink(latitude: number, longitude: number, label?: string) {
  const query = label ? `${label} @ ${latitude},${longitude}` : `${latitude},${longitude}`;
  const encoded = encodeURIComponent(query);
  return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&query=${encoded}#map=16/${latitude}/${longitude}`;
}

export function calculateDeliveryCharge(
  settings: RestaurantSettingsDocument,
  orderSubtotal: number,
  distance?: number | null,
): number {
  if (settings.deliveryChargeType === 'FREE') {
    return 0;
  }

  if (settings.freeDeliveryEnabled && orderSubtotal >= settings.freeDeliveryMinimumOrder) {
    return 0;
  }

  const value = Math.max(0, settings.deliveryChargeValue || 0);

  if (settings.deliveryChargeType === 'DISTANCE_BASED') {
    const validDistance = typeof distance === 'number' ? Math.max(0, distance) : 0;
    return Number((validDistance * value).toFixed(2));
  }

  return Number(value.toFixed(2));
}

export async function checkDeliveryEligibilityAsync(
  address: AddressDocument,
  settings: RestaurantSettingsDocument,
  orderSubtotal: number,
): Promise<DeliveryEligibilityResult> {
  if (!settings.deliveryEnabled) {
    return {
      eligible: false,
      reason: 'DELIVERY_DISABLED',
      reasonMessage: 'Delivery is currently disabled for this restaurant.',
      distance: null,
      radius: settings.deliveryRadius || null,
      unit: settings.deliveryRadiusUnit || 'KM',
      deliveryCharge: 0,
    };
  }

  if (!settings.pickupEnabled && !settings.deliveryEnabled) {
    return {
      eligible: false,
      reason: 'PICKUP_DISABLED',
      reasonMessage: 'Pickup is currently disabled for this restaurant.',
      distance: null,
      radius: settings.deliveryRadius || null,
      unit: settings.deliveryRadiusUnit || 'KM',
      deliveryCharge: 0,
    };
  }

  const hasRestaurantCoords = typeof settings.latitude === 'number' && typeof settings.longitude === 'number';
  const hasAddressCoords = typeof address.latitude === 'number' && typeof address.longitude === 'number';

  if (!hasRestaurantCoords || !hasAddressCoords) {
    return {
      eligible: false,
      reason: 'MISSING_LOCATION',
      reasonMessage:
        'Delivery location cannot be verified because address coordinates are missing. Please add latitude and longitude or restaurant location details.',
      distance: null,
      radius: settings.deliveryRadius || null,
      unit: settings.deliveryRadiusUnit || 'KM',
      deliveryCharge: 0,
    };
  }

  // Provider-independent geodesic distance: no Google Maps API key required.
  let distanceKm = haversineDistanceKm(settings.latitude!, settings.longitude!, address.latitude!, address.longitude!);

  try {
    const { getDistanceKm } = await import('@/src/services/map-provider');
    const providerDistance = await getDistanceKm(settings.latitude!, settings.longitude!, address.latitude!, address.longitude!);
    if (typeof providerDistance === 'number' && Number.isFinite(providerDistance) && providerDistance > 0) {
      distanceKm = providerDistance;
    }
  } catch {
    // ignore
  }

  const unit = settings.deliveryRadiusUnit || 'KM';
  const distance = unit === 'MILES' ? kmToMiles(distanceKm) : distanceKm;
  const roundedDistance = Number(distance.toFixed(2));

  if (settings.deliveryRadius && settings.deliveryRadius > 0 && roundedDistance > settings.deliveryRadius) {
    return {
      eligible: false,
      reason: 'OUTSIDE_RADIUS',
      reasonMessage: `Delivery address is outside the configured delivery radius of ${settings.deliveryRadius} ${unit}.`,
      distance: roundedDistance,
      radius: settings.deliveryRadius,
      unit,
      deliveryCharge: 0,
    };
  }

  return {
    eligible: true,
    reason: 'ELIGIBLE',
    reasonMessage: 'Delivery is available for this address.',
    distance: roundedDistance,
    radius: settings.deliveryRadius || null,
    unit,
    deliveryCharge: calculateDeliveryCharge(settings, orderSubtotal, roundedDistance),
  };
}

export function generateDeliveryWhatsAppMessage(order: OrderDocument, settings: RestaurantSettingsDocument) {
  const lines: string[] = [];
  lines.push(`Pizza Vizza - Delivery Details`);
  lines.push(`Order: ${order.orderNumber}`);
  lines.push(`Customer: ${order.customerSnapshot.name}`);
  if (order.customerSnapshot.mobile) {
    lines.push(`Mobile: ${order.customerSnapshot.mobile}`);
  }

  if (order.fulfillmentType === 'DELIVERY' && order.deliveryAddress) {
    lines.push(`Delivery address:`);
    lines.push(`${order.deliveryAddress.fullName}`);
    lines.push(`${order.deliveryAddress.addressLine1}${order.deliveryAddress.addressLine2 ? ', ' + order.deliveryAddress.addressLine2 : ''}`);
    if (order.deliveryAddress.landmark) {
      lines.push(`Landmark: ${order.deliveryAddress.landmark}`);
    }
    lines.push(`${order.deliveryAddress.city}, ${order.deliveryAddress.state} ${order.deliveryAddress.postalCode}`);
    if (typeof order.deliveryAddress.latitude === 'number' && typeof order.deliveryAddress.longitude === 'number') {
      lines.push(`Coordinates: ${order.deliveryAddress.latitude}, ${order.deliveryAddress.longitude}`);
    }
    if (order.deliveryAddress.googleMapsUrl) {
      lines.push(`Map: ${order.deliveryAddress.googleMapsUrl}`);
    }
  } else if (order.fulfillmentType === 'PICKUP') {
    lines.push(`Pickup at: ${settings.restaurantName}`);
    if (settings.addressLine1) {
      lines.push(`${settings.addressLine1}${settings.addressLine2 ? ', ' + settings.addressLine2 : ''}`);
    }
    if (settings.city) {
      lines.push(`${settings.city}, ${settings.state} ${settings.postalCode}`);
    }
    if (settings.googleMapsUrl) {
      lines.push(`Pickup map: ${settings.googleMapsUrl}`);
    }
  }

  if (order.deliveryNote) {
    lines.push(`Note: ${order.deliveryNote}`);
  }

  lines.push(`Items:`);
  order.items.forEach((item) => {
    lines.push(`- ${item.name} x ${item.quantity} = ₹${item.subtotal.toFixed(2)}`);
    if (item.selectedOptions?.length) {
      item.selectedOptions.forEach((option) => {
        lines.push(`  + ${option.groupName}: ${option.optionName} (₹${option.price.toFixed(2)})`);
      });
    }
  });
  lines.push(`Subtotal: ₹${order.subtotal.toFixed(2)}`);
  if (order.discount > 0) lines.push(`Discount: -₹${order.discount.toFixed(2)}`);
  if (order.walletAmount > 0) lines.push(`Wallet used: -₹${order.walletAmount.toFixed(2)}`);
  if (order.deliveryCharge > 0) lines.push(`Delivery charge: ₹${order.deliveryCharge.toFixed(2)}`);
  lines.push(`Total: ₹${order.totalAmount.toFixed(2)}`);
  lines.push(`Payment: ${order.paymentMethod || 'Not specified'} (${order.paymentStatus})`);

  return lines.join('\n');
}
