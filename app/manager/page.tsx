import { requirePermission } from '@/src/auth/guard';
import OperationsCenter from '@/src/components/admin/operations-center';
import StaffShell from '@/src/components/staff/staff-shell';
import Link from 'next/link';

export default async function ManagerPage() {
  const user = await requirePermission('orders.view');
  return <StaffShell name={user.name} role={user.role}><div className="mb-4 flex justify-end"><Link href="/manager/counter-order" className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white">Create counter order</Link></div><OperationsCenter /></StaffShell>;
}