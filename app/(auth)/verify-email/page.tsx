import { VerifyEmailForm } from '@/src/components/auth/verify-email-form';

export default async function VerifyEmailPage({ searchParams }: { searchParams?: Promise<{ email?: string; mobile?: string }> }) {
  const params = searchParams ? await searchParams : {};
  return <VerifyEmailForm initialEmail={params.email || ''} initialMobile={params.mobile || ''} />;
}