import { requirePermission } from '@/src/auth/guard';
import OperationsCenter from '@/src/components/admin/operations-center';
import StaffShell from '@/src/components/staff/staff-shell';

export default async function ManagerPage() {
  const user = await requirePermission('orders.view');
  return <StaffShell name={user.name} role={user.role}><OperationsCenter /></StaffShell>;
}