import { redirect } from 'next/navigation';
import { getSessionUser } from '@/src/auth/session';
import { CustomerShell } from '@/src/app-shell';
import { getWalletBalance, getWalletLedger } from '@/src/models/wallet';
import { findReferralByUser } from '@/src/models/referral';
import { ensureUserCode } from '@/src/services/user-service';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

export default async function WalletPage() {
  const user = await getSessionUser();
  if (!user) redirect('/login');

  const userId = user._id?.toHexString() || user.id || '';
  const userCode = await ensureUserCode(user);
  const [balance, ledger, referral, settings] = await Promise.all([
    getWalletBalance(userId).catch(() => 0),
    getWalletLedger(userId).catch(() => []),
    findReferralByUser(userId).catch(() => null),
    getRestaurantSettings().catch(() => null),
  ]);

  return (
    <CustomerShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-stone-200 bg-white p-8 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Wallet & rewards</p>
          <h1 className="mt-3 text-3xl font-semibold text-stone-900">Your account credits</h1>
          <p className="mt-2 text-sm text-stone-600">Use your wallet balance for future orders and review reward activity.</p>
          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">Your user ID</p>
            <p className="mt-1 font-mono text-xl font-semibold tracking-[0.12em] text-stone-900">{userCode}</p>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">Current balance</h2>
            <p className="mt-4 text-4xl font-semibold text-amber-700">{formatCurrency(balance)}</p>
            {settings?.referralEnabled === true && user.role === 'CUSTOMER' ? <div className="mt-6 rounded-2xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-sm text-stone-600">Referral code</p>
              <p className="mt-1 text-lg font-semibold text-stone-900">{referral?.code || 'No referral created yet'}</p>
            </div> : null}
          </div>

          <div className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-stone-900">Recent activity</h2>
            {ledger.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-stone-200 p-6 text-sm text-stone-600">No wallet activity yet.</div>
            ) : (
              <ul className="mt-6 space-y-3">
                {ledger.map((entry) => (
                  <li key={entry._id?.toHexString() || `${entry.reason}-${entry.createdAt.toISOString()}`} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-stone-900">{entry.reason}</p>
                        <p className="mt-1 text-sm text-stone-600">{entry.type}</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${entry.amount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{entry.amount >= 0 ? '+' : ''}{formatCurrency(entry.amount)}</p>
                        <p className="mt-1 text-sm text-stone-600">Balance {formatCurrency(entry.balanceAfter)}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </CustomerShell>
  );
}
