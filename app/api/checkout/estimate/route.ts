import { NextResponse } from 'next/server';
import { getSessionUser } from '@/src/auth/session';
import { findAddressById } from '@/src/models/address';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { calculateOrderTotals } from '@/src/services/order-service';
import { checkDeliveryEligibilityAsync } from '@/src/services/delivery-service';

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const payload = await request.json();
  const { fulfillmentType, addressId, items } = payload as {
    fulfillmentType?: string;
    addressId?: string;
    items?: Array<{ productId: string; quantity: number; selectedOptionIds?: string[]; selectedOptions?: Array<{ optionId: string }> }>;
  };

  if (!fulfillmentType) return NextResponse.json({ error: 'fulfillmentType is required' }, { status: 400 });

  const safeItems = Array.isArray(items) ? items : [];
  const calc = await calculateOrderTotals(safeItems.map((i) => ({
    productId: i.productId,
    quantity: i.quantity,
    selectedOptionIds: Array.isArray(i.selectedOptionIds)
      ? i.selectedOptionIds
      : Array.isArray(i.selectedOptions)
      ? i.selectedOptions.map((option) => option.optionId).filter(Boolean)
      : [],
  })));
  const settings = await getRestaurantSettings();

  if (fulfillmentType === 'DELIVERY') {
    if (!addressId) return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 });
    const address = await findAddressById(addressId);
    if (!address || address.userId !== user._id!.toHexString()) {
      return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    const eligibility = await checkDeliveryEligibilityAsync(address, settings, calc.subtotal);
    return NextResponse.json({ success: true, data: { orderSubtotal: calc.subtotal, deliveryCharge: eligibility.deliveryCharge, deliveryEligibility: eligibility } });
  }

  return NextResponse.json({ success: true, data: { orderSubtotal: calc.subtotal, deliveryCharge: 0, deliveryEligibility: { eligible: true, reason: 'ELIGIBLE', reasonMessage: 'Pickup selected', distance: null, radius: null, unit: settings.deliveryRadiusUnit, deliveryCharge: 0 } } });
}
