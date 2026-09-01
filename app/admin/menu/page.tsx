import { requireAdminAccess } from '@/src/auth/guard';
import Link from 'next/link';

export default async function AdminMenuIndexPage() {
  await requireAdminAccess();

  return (
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Menu</h1>
      <p className="text-sm text-stone-600">Manage restaurant menu categories and products.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/menu/categories" className="rounded-2xl border border-stone-200 bg-white p-6 text-center hover:shadow">
          <div className="text-lg font-medium">Categories</div>
          <div className="mt-1 text-sm text-stone-500">View and manage menu categories</div>
        </Link>

        <Link href="/admin/menu/products" className="rounded-2xl border border-stone-200 bg-white p-6 text-center hover:shadow">
          <div className="text-lg font-medium">Products</div>
          <div className="mt-1 text-sm text-stone-500">View and manage menu products</div>
        </Link>

        <Link href="/admin/menu/customization-groups" className="rounded-2xl border border-stone-200 bg-white p-6 text-center hover:shadow">
          <div className="text-lg font-medium">Customization groups</div>
          <div className="mt-1 text-sm text-stone-500">Create and manage menu customization options</div>
        </Link>
      </div>
    </div>
  );
}
