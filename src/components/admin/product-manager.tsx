'use client';

import { useMemo, useState } from 'react';
import { getIdString } from '@/src/lib/id';
import { ProductForm, type Category, type CustomizationGroup, type ProductLike } from '@/src/components/admin/product-form';

export function AdminProductManager({ categories, initialProducts, customizationGroups }: { categories: Category[]; initialProducts: ProductLike[]; customizationGroups: CustomizationGroup[] }) {
  const [products, setProducts] = useState<ProductLike[]>(initialProducts);
  const [editingId, setEditingId] = useState<string | null>(null);

  const editingProduct = useMemo(
    () => products.find((product) => getIdString(product._id || product.id) === editingId) || null,
    [editingId, products],
  );

  function handleSaved(product: ProductLike) {
    const productId = getIdString(product._id || product.id);
    setProducts((current) => {
      const exists = current.some((item) => getIdString(item._id || item.id) === productId);
      if (exists) {
        return current.map((item) => (getIdString(item._id || item.id) === productId ? product : item));
      }
      return [product, ...current];
    });
    setEditingId(null);
  }

  return (
    <div className="space-y-6">
      <ProductForm
        key={editingId || 'new'}
        categories={categories}
        customizationGroups={customizationGroups}
        editingProduct={editingProduct}
        onSaved={handleSaved}
        onCancel={() => setEditingId(null)}
      />

      <div className="grid gap-3 md:grid-cols-2">
        {products.map((product) => {
          const productId = getIdString(product._id || product.id);
          return (
            <article key={productId || product.slug} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    {product.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={product.image} alt={product.name} className="h-12 w-12 rounded-xl object-cover" />
                    ) : null}
                    <div>
                      <h2 className="font-semibold text-stone-900">{product.name}</h2>
                      <p className="mt-1 text-sm text-stone-600">{product.slug}</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingId(productId || product.slug)}
                  className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-700"
                >
                  Edit
                </button>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <span className={`rounded-full px-2 py-1 ${product.isAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-stone-100 text-stone-600'}`}>
                  {product.isAvailable ? 'Visible' : 'Hidden'}
                </span>
                {product.isFeatured ? <span className="rounded-full bg-amber-50 px-2 py-1 text-amber-700">Featured</span> : null}
                {product.discountPrice ? <span className="rounded-full bg-red-50 px-2 py-1 text-red-700">Offer ₹{product.discountPrice}</span> : null}
              </div>

              <div className="mt-4 space-y-2 text-sm text-stone-600">
                <div className="flex items-center justify-between"><span>Price</span><span className="font-semibold text-stone-900">₹{product.price}</span></div>
                <div className="flex items-center justify-between"><span>Prep</span><span>{product.preparationTime ? `${product.preparationTime} min` : '—'}</span></div>
                <div className="flex items-center justify-between"><span>Category</span><span>{product.categoryId || '—'}</span></div>
                <div className="flex items-center justify-between"><span>Custom groups</span><span>{product.customizationGroupIds?.length ? product.customizationGroupIds.length : '0'}</span></div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
