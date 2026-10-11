import { ForgotPasswordForm } from '@/src/components/auth/forgot-password-form';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { getFirebasePublicConfig } from '@/src/services/firebase-client-config';

export default async function ForgotPasswordPage() {
  const settings = await getRestaurantSettings().catch(() => null);
  const firebase = getFirebasePublicConfig();
  return <ForgotPasswordForm passwordResetOtpMode={settings?.passwordResetOtpMode || 'EMAIL_ONLY'} firebase={firebase} />;
}
