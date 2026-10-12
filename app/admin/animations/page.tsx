import { requireAdminPermission } from '@/src/auth/guard';
import AnimationSettingsPanel from '@/src/components/admin/animation-settings-panel';

export default async function AnimationSettingsPage() {
  await requireAdminPermission('settings.view');

  return (
    <div className="mx-auto max-w-4xl space-y-5 px-0 py-2 sm:p-8 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Animation</h1>
        <p className="mt-1 text-sm text-stone-600">Control the subtle, looping animations shown across customer-facing pages.</p>
      </div>
      <AnimationSettingsPanel />
    </div>
  );
}
