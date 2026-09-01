import { requireAdminAccess } from '@/src/auth/guard';
import { adminListProducts, adminListCategories, adminListCustomizationGroups } from '@/src/services/menu-service';
import { AdminProductManager } from '@/src/components/admin/product-manager';
import { type Category, type ProductLike, type CustomizationGroup } from '@/src/components/admin/product-form';

function toPlainIdString(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const record = value as { toHexString?: () => string };
    if (typeof record.toHexString === 'function') return record.toHexString();
  }
  return '';
}

function toSerializableProduct(doc: Awaited<ReturnType<typeof adminListProducts>>[number] | null | undefined): ProductLike | null {
  if (!doc) return null;

  const rawId = toPlainIdString((doc as { _id?: unknown })._id ?? (doc as { id?: unknown }).id);
  const serializable: ProductLike = {
    ...doc,
    _id: rawId || undefined,
    id: rawId || undefined,
  };

  return serializable;
}

function toSerializableCategory(doc: Awaited<ReturnType<typeof adminListCategories>>[number] | null | undefined): Category | null {
  if (!doc) return null;

  const rawId = toPlainIdString((doc as { _id?: unknown })._id ?? (doc as { id?: unknown }).id);
  const serializable: Category = {
    ...doc,
    _id: rawId || undefined,
    name: doc.name,
  };

  return serializable;
}

export default async function AdminProductsPage() {
  await requireAdminAccess();
  const products: ProductLike[] = (await adminListProducts()).map((product) => toSerializableProduct(product)).filter((item): item is ProductLike => Boolean(item));
  const categories: Category[] = (await adminListCategories()).map((category) => toSerializableCategory(category)).filter((item): item is Category => Boolean(item));
  const customizationGroups: CustomizationGroup[] = (await adminListCustomizationGroups()).map((group) => ({
    id: toPlainIdString((group as { id?: unknown }).id),
    name: group.name,
  }));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">Products</h1>
            <p className="text-sm text-stone-600">Create, edit, and manage offers, images, visibility, and pricing for every menu item.</p>
          </div>
          <div className="rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">{products.length} items</div>
        </div>
        <div className="mt-6">
          <AdminProductManager categories={categories} initialProducts={products} customizationGroups={customizationGroups} />
        </div>
      </section>
    </div>
  );
}
