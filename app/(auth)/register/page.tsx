import { redirect } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { RegisterForm } from '@/src/components/auth/register-form';

export default async function RegisterPage() {
  const user = await getSessionUser();

  if (user) {
    redirect('/account');
  }

  return <RegisterForm />;
}
