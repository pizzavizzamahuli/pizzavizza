import { requirePermission } from '@/src/auth/guard';
import KitchenDashboard from '@/src/components/staff/kitchen-dashboard';
import StaffShell from '@/src/components/staff/staff-shell';

export default async function KitchenPage() {
  const user = await requirePermission('kitchen.view');
  return <StaffShell name={user.name} role={user.role}><KitchenDashboard /></StaffShell>;
}