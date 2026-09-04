import { requirePermission } from '@/src/auth/guard';
import CounterOrderForm from '@/src/components/admin/counter-order-form';
import StaffShell from '@/src/components/staff/staff-shell';

export default async function ManagerCounterOrderPage() {
  const user = await requirePermission('orders.manage');
  return <StaffShell name={user.name} role={user.role}><CounterOrderForm /></StaffShell>;
}