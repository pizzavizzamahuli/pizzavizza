import { requireAdminAccess } from '@/src/auth/guard';
import { adminListCategories } from '@/src/services/menu-service';
import { CategoryForm } from '@/src/components/admin/category-form';


export default async function AdminCategoriesPage() {
  await requireAdminAccess();
  const categories = await adminListCategories();

  return (
    <div className="space-y-6">
      <section className="rounded-xl border bg-white p-6">
        <h1 className="text-2xl font-semibold">Menu Categories</h1>
        <p className="text-sm text-stone-600">Create and manage categories.</p>
        <div className="mt-6">
          <CategoryForm />
        </div>
        <div className="mt-6">
          <ul className="space-y-3">
            {categories.map((c) => (
              <li key={c._id?.toHexString()} className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="font-semibold">{c.name}</div>
                  <div className="text-sm text-stone-500">{c.slug} • {c.isActive ? 'Active' : 'Inactive'}</div>
                </div>
                <div className="text-sm text-stone-500">Order: {c.displayOrder ?? 0}</div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
