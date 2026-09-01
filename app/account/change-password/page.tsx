import { requireAuth } from '@/src/auth/guard';
import { ChangePasswordForm } from '@/src/components/auth/change-password-form';

export default async function ChangePasswordPage() {
  await requireAuth();

  return <ChangePasswordForm />;
}
