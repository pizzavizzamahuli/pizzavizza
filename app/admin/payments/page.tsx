import { requireAdminAccess } from '@/src/auth/guard';
import PaymentAdminPanel from '@/src/components/admin/payment-admin-panel';

export default async function AdminPaymentsPage() {
  await requireAdminAccess();

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Payments</h1>
      <p className="text-sm text-stone-600">Review pending payment verification requests and reconcile payment status for orders.</p>
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <PaymentAdminPanel />
      </div>
    </div>
  );
}
