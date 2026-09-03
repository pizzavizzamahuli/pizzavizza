import { requireAdminAccess } from '@/src/auth/guard';
import { AdminUserManagement } from '@/src/components/admin/admin-user-management';
import RestaurantSettingsForm from '@/src/components/admin/restaurant-settings-form';
import SecretSettingsForm from '@/src/components/admin/secret-settings-form';
import AuditLogViewer from '@/src/components/admin/audit-log-viewer';
import LegalPagesPanel from '@/src/components/admin/legal-pages-panel';

export default async function AdminSettingsPage() {
  await requireAdminAccess();

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-0 py-2 sm:p-8 sm:space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <p className="text-sm text-stone-600">Manage staff access, reset flows, and future restaurant settings from this console.</p>
      <div className="space-y-3">
        <details className="group rounded-2xl border border-stone-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-lg font-semibold text-stone-900 [&::-webkit-details-marker]:hidden">
            Audit Logs
            <span className="text-sm font-normal text-stone-500 group-open:hidden">Open section</span>
            <span className="hidden text-sm font-normal text-stone-500 group-open:inline">Close section</span>
          </summary>
          <div className="border-t border-stone-200 p-4 sm:p-5"><AuditLogViewer /></div>
        </details>
        <details className="group rounded-2xl border border-stone-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-lg font-semibold text-stone-900 [&::-webkit-details-marker]:hidden">
            User, Admin &amp; Staff Management
            <span className="text-sm font-normal text-stone-500 group-open:hidden">Open section</span>
            <span className="hidden text-sm font-normal text-stone-500 group-open:inline">Close section</span>
          </summary>
          <div className="border-t border-stone-200 p-4 sm:p-5"><AdminUserManagement /></div>
        </details>
        <details className="group rounded-2xl border border-stone-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-lg font-semibold text-stone-900 [&::-webkit-details-marker]:hidden">
            Server Secrets
            <span className="text-sm font-normal text-stone-500 group-open:hidden">Open section</span>
            <span className="hidden text-sm font-normal text-stone-500 group-open:inline">Close section</span>
          </summary>
          <div className="border-t border-stone-200 p-4 sm:p-5"><SecretSettingsForm /></div>
        </details>
        <details className="group rounded-2xl border border-stone-200 bg-white shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-lg font-semibold text-stone-900 [&::-webkit-details-marker]:hidden">
            Legal Pages
            <span className="text-sm font-normal text-stone-500 group-open:hidden">Open section</span>
            <span className="hidden text-sm font-normal text-stone-500 group-open:inline">Close section</span>
          </summary>
          <div className="border-t border-stone-200 p-4 sm:p-5"><LegalPagesPanel /></div>
        </details>
      </div>
      <div className="grid gap-5 lg:grid-cols-2 lg:gap-6">
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <h2 className="text-lg font-semibold">Restaurant Settings</h2>
          <RestaurantSettingsForm />
        </div>
      </div>
    </div>
  );
}
