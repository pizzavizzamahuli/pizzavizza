import CheckoutForm from '@/src/components/checkout/checkout-form';
import { getSessionUser } from '@/src/auth/session';
import { redirect } from 'next/navigation';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

export default async function CheckoutPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect('/login');
  }

  const settings = await getRestaurantSettings();

  return (
    <div className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Checkout</h1>
      <div className="mt-6">
        <CheckoutForm
          settings={{
            deliveryEnabled: settings.deliveryEnabled,
            pickupEnabled: settings.pickupEnabled,
            codEnabled: settings.codEnabled,
            onlinePaymentEnabled: settings.onlinePaymentEnabled,
            manualPaymentEnabled: settings.manualPaymentEnabled,
            manualPaymentUpiId: settings.manualPaymentUpiId || null,
            manualPaymentQrUrl: settings.manualPaymentQrUrl || null,
            manualPaymentBankDetails: settings.manualPaymentBankDetails || null,
          }}
        />
      </div>
    </div>
  );
}
