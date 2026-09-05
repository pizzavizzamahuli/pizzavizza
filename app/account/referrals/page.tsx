import { redirect } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { CustomerShell } from '@/src/app-shell';
import { createReferral, findReferralByUser } from '@/src/models/referral';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { ReferralShareCard } from '@/src/components/referrals/referral-share-card';

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

export default async function ReferralsPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  const settings = await getRestaurantSettings();
  if (user.role !== 'CUSTOMER' || settings.referralEnabled !== true) redirect('/account');

  const userId = user._id?.toHexString() || user.id || '';
  const referral = await findReferralByUser(userId).catch(() => null);
  const activeReferral = referral ?? (await createReferral(userId, settings.referralReferrerRewardAmount || 50).catch(() => null));

  return (
    <CustomerShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Referrals</p>
          <h1 className="mt-3 text-3xl font-semibold text-stone-900">Invite friends and earn rewards</h1>
          <p className="mt-2 text-sm text-stone-600">Share your referral code to reward both you and the friend who joins.</p>
        </section>

        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-stone-900">Your referral code</h2>
              <p className="mt-2 text-sm text-stone-600">Share your invitation link and earn wallet credits when a friend places their first order.</p>
            </div>
            <div className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">Reward {formatCurrency(activeReferral?.rewardValue || 50)}</div>
          </div>

          <div className="mt-6">
            <ReferralShareCard code={activeReferral?.code || 'PZVXXXX'} rewardValue={activeReferral?.rewardValue || 50} />
          </div>

          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-semibold text-stone-800">How it works</p>
              <p className="mt-2 text-sm text-stone-600">Your friend signs up with your code, places an order, and you receive a wallet credit automatically.</p>
            </div>
            <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm font-semibold text-stone-800">Available rewards</p>
              <p className="mt-2 text-sm text-stone-600">Wallet credit is added after the first successful order, and the code remains active for future referrals.</p>
            </div>
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
