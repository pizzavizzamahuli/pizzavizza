import { requireAdminAccess } from '@/src/auth/guard';
import ReferralAdminPanel from '@/src/components/admin/referral-admin-panel';

export default async function AdminReferralsPage() {
  await requireAdminAccess();

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold">Referrals</h2>
        <p className="text-sm text-stone-600">Generate referral codes and reward successful signups or orders.</p>
      </div>
      <ReferralAdminPanel />
    </div>
  );
}
