import { requireAdminAccess } from '@/src/auth/guard';
import WalletAdminPanel from '@/src/components/admin/wallet-admin-panel';

export default async function AdminWalletPage() {
  await requireAdminAccess();

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Wallet</h1>
        <p className="text-sm text-stone-600">View balances and issue or deduct store credit for customers.</p>
      </div>
      <WalletAdminPanel />
    </div>
  );
}
