import { requirePermission } from '@/src/auth/guard';
import KitchenDashboard from '@/src/components/staff/kitchen-dashboard';

export default async function KitchenPage() {
  await requirePermission('kitchen.view');
  return <KitchenDashboard />;
}