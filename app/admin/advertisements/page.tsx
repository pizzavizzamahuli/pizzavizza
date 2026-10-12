import { requireAdminPermission } from '@/src/auth/guard';
import { AuthorizationService } from '@/src/config/permissions';
import AdvertisementManagement from '@/src/components/admin/advertisement-management';

export default async function AdvertisementManagementPage() {
  const user = await requireAdminPermission('settings.view');
  const canManage = AuthorizationService.canAccess(user.role, 'settings.manage', user.permissions);

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-0 py-2 sm:p-8 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Advertisement Management</h1>
        <p className="mt-1 text-sm text-stone-600">Configure Google AdSense and manage local business campaigns. Both ad types start disabled.</p>
      </div>
      <AdvertisementManagement canManage={canManage} />
    </div>
  );
}
