import { requireAdminAccess } from '@/src/auth/guard';
import { AuthorizationService } from '@/src/config/permissions';
import Link from 'next/link';
import CustomerManagementPanel from '@/src/components/admin/customer-management-panel';
import { getUsersCollection } from '@/src/models/user';
import { listOrders } from '@/src/models/order';
import { listDiningBookings } from '@/src/models/dining-booking';
import { getWalletBalance } from '@/src/models/wallet';
import { findReferralByUser } from '@/src/models/referral';
import { getIdString } from '@/src/lib/id';
import { ensureUserCode } from '@/src/services/user-service';

export default async function AdminCustomersPage({ searchParams }: { searchParams?: Promise<{ userId?: string }> }) {
  const admin = await requireAdminAccess();
  if (!AuthorizationService.canAccess(admin.role, 'customers.view')) return null;
  const params = searchParams ? await searchParams : {};
  const usersCollection = await getUsersCollection();
  const users = await usersCollection
    .find({ ...(admin.role === 'MAIN_ADMIN' ? {} : { role: 'CUSTOMER' }), ...(params.userId ? { userCode: params.userId.trim() } : {}) })
    .sort({ createdAt: -1 })
    .limit(50)
    .toArray();

  const customerSummaries = await Promise.all(
    users.map(async (user) => {
      const userId = getIdString(user._id) || user.id || '';
      const [orders, bookings, wallet, referral] = await Promise.all([
        listOrders({ userId }).catch(() => []),
        listDiningBookings({ userId }).catch(() => []),
        getWalletBalance(userId).catch(() => 0),
        findReferralByUser(userId).catch(() => null),
      ]);

      return {
        ...user,
        id: userId,
        userCode: await ensureUserCode(user),
        orders,
        bookings,
        walletBalance: wallet,
        referral,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Customers</h1>
            <p className="text-sm text-stone-600">Live customer accounts, orders, bookings, wallet activity, and referrals.</p>
          </div>
          <div className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{customerSummaries.length} accounts</div>
        </div>
        <form method="get" className="mt-4 flex max-w-xl gap-2"><input name="userId" defaultValue={params.userId || ''} placeholder="Search by compact User ID" className="min-w-0 flex-1 rounded-xl border border-stone-300 px-3 py-2 text-sm" /><button type="submit" className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white">Search</button></form>
      </section>

      <CustomerManagementPanel />

      <section className="grid gap-4">
        {customerSummaries.map((customer) => {
          const customerId = customer.id || getIdString(customer._id) || '';
          return (
            <article key={customerId} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold text-stone-900">{customer.name}</h2>
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-stone-600">User ID: {customer.userCode}</span>
                  </div>
                  <p className="mt-1 text-sm text-stone-600">{customer.email}</p>
                  <p className="mt-1 text-sm text-stone-500">{customer.mobile || 'No mobile on file'}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">{customer.accountStatus}</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-600">{customer.orders.length} orders</span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-600">{customer.bookings.length} bookings</span>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl bg-stone-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Wallet</p>
                  <p className="mt-1 text-lg font-semibold text-stone-900">₹{(customer.walletBalance || 0).toFixed(2)}</p>
                </div>
                <div className="rounded-2xl bg-stone-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Referral</p>
                  <p className="mt-1 text-lg font-semibold text-stone-900">{customer.referral?.code || '—'}</p>
                </div>
                <div className="rounded-2xl bg-stone-50 p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Joined</p>
                  <p className="mt-1 text-lg font-semibold text-stone-900">{new Date(customer.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <Link href={`/admin/customers/${encodeURIComponent(customer.userCode)}`} className="mt-4 inline-flex rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">View complete customer details</Link>
            </article>
          );
        })}
      </section>
    </div>
  );
}
