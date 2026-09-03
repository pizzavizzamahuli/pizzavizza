import { requirePermission } from '@/src/auth/guard';
import OperationsCenter from '@/src/components/admin/operations-center';

export default async function ManagerPage() {
  await requirePermission('orders.view');
  return <OperationsCenter />;
}