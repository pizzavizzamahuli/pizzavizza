import { requireAdminAccess } from '@/src/auth/guard';
import CouponAdminPanel from '@/src/components/admin/coupon-admin-panel';

export default async function AdminCouponsPage() {
  await requireAdminAccess();

  return (
    <div className="mx-auto max-w-5xl p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Coupons</h1>
        <p className="text-sm text-stone-600">Create and manage time-bound coupons, percentage or fixed discounts, and usage limits.</p>
      </div>
      <CouponAdminPanel />
    </div>
  );
}
