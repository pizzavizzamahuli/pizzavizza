import { requireAdminAccess } from '@/src/auth/guard';
import { adminListCustomizationGroups } from '@/src/services/menu-service';
import { CustomizationGroupForm } from '@/src/components/admin/customization-group-form';
import { CustomizationGroupList } from '@/src/components/admin/customization-group-list';

export default async function AdminCustomizationGroupsPage() {
  await requireAdminAccess();
  const groups = await adminListCustomizationGroups();
  const serializableGroups = groups.map((group) => ({
    id: group.id ?? group._id?.toHexString() ?? '',
    name: group.name,
    description: group.description ?? null,
    isActive: group.isActive,
    required: group.required,
    options: group.options?.map((option) => ({ id: option.id, name: option.name })) ?? [],
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Customization groups</h1>
        <p className="text-sm text-stone-600">Create and manage groups of product customization options.</p>
        <div className="mt-6">
          <CustomizationGroupForm />
        </div>
        <div className="mt-6">
          <CustomizationGroupList groups={serializableGroups} />
        </div>
      </section>
    </div>
  );
}
