import { requireAdminAccess } from '@/src/auth/guard';
import { AdminUserManagement } from '@/src/components/admin/admin-user-management';
import RestaurantSettingsForm from '@/src/components/admin/restaurant-settings-form';
import SecretSettingsForm from '@/src/components/admin/secret-settings-form';
import AuditLogViewer from '@/src/components/admin/audit-log-viewer';
import LegalPagesPanel from '@/src/components/admin/legal-pages-panel';

export default async function AdminSettingsPage() {
  await requireAdminAccess();

  return (
    <div className="mx-auto max-w-4xl px-0 py-2 space-y-5 sm:p-8 sm:space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-stone-600">Manage staff access, reset flows, and future restaurant settings from this console.</p>
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <AdminUserManagement />
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Restaurant Settings</h2>
          <RestaurantSettingsForm />
          <div className="mt-6">
            <h3 className="text-sm font-medium">Server Secrets</h3>
            <p className="text-xs text-stone-500">Manage server-side API keys (values are hidden for security).</p>
            <div className="mt-3">
              {/* Lazy-load secret form to keep bundle small */}
              <SecretSettingsForm />
            </div>
            <div className="mt-6">
              <h3 className="text-sm font-medium">Audit Log</h3>
              <p className="text-xs text-stone-500">Recent store and secret change events.</p>
              <div className="mt-3">
                <AuditLogViewer />
              </div>
            </div>
          </div>
        </div>
        <LegalPagesPanel />
      </div>
    </div>
  );
}
