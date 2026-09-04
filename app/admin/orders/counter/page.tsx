import { requirePermission } from '@/src/auth/guard';
import CounterOrderForm from '@/src/components/admin/counter-order-form';

export default async function CounterOrderPage() {
  await requirePermission('orders.manage');
  return <CounterOrderForm />;
}
