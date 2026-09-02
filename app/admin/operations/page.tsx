import { requireAdminAccess } from '@/src/auth/guard';
import OperationsCenter from '@/src/components/admin/operations-center';

export default async function OperationsPage() {
  await requireAdminAccess();
  return <OperationsCenter />;
}
