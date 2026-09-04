import CheckoutForm from '@/src/components/checkout/checkout-form';
import { getSessionUser } from '@/src/auth/session';
import { redirect } from 'next/navigation';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

export default async function CheckoutPage({ searchParams }: { searchParams?: Promise<{ bookingNumber?: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const settings = await getRestaurantSettings();
  const params = searchParams ? await searchParams : {};

  return (
    <div className="mx-auto max-w-3xl px-0 py-2 sm:p-8">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <div className="mt-6">
        <CheckoutForm
          reservationBookingNumber={params.bookingNumber || null}
          settings={{
            deliveryEnabled: settings.deliveryEnabled,
            pickupEnabled: settings.pickupEnabled,
            codEnabled: settings.codEnabled,
            onlinePaymentEnabled: settings.onlinePaymentEnabled,
            manualPaymentEnabled: settings.manualPaymentEnabled,
            manualPaymentUpiId: settings.manualPaymentUpiId || null,
            manualPaymentQrUrl: settings.manualPaymentQrUrl || null,
            manualPaymentBankDetails: settings.manualPaymentBankDetails || null,
            deliveryBaseDistance: settings.deliveryBaseDistance,
            deliveryBaseCharge: settings.deliveryBaseCharge,
            deliveryAdditionalChargePerKm: settings.deliveryAdditionalChargePerKm,
            freeDeliveryEnabled: settings.freeDeliveryEnabled,
            freeDeliveryMinimumOrder: settings.freeDeliveryMinimumOrder,
            latitude: settings.latitude,
            longitude: settings.longitude,
            deliveryRadius: settings.deliveryRadius,
            deliveryRadiusUnit: settings.deliveryRadiusUnit,
          }}
        />
      </div>
    </div>
  );
}
