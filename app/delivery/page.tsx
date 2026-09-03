import { requirePermission } from '@/src/auth/guard';
import DeliveryDashboard from '@/src/components/staff/delivery-dashboard';

export default async function DeliveryPage() {
  await requirePermission('delivery.view');
  return <DeliveryDashboard />;
}