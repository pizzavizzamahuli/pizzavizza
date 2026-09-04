import { requirePermission } from '@/src/auth/guard';
import DeliveryDashboard from '@/src/components/staff/delivery-dashboard';
import StaffShell from '@/src/components/staff/staff-shell';

export default async function DeliveryPage() {
  const user = await requirePermission('delivery.view');
  return <StaffShell name={user.name} role={user.role}><DeliveryDashboard /></StaffShell>;
}