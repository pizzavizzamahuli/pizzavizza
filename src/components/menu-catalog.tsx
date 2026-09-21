'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import ImageCarousel from '@/src/components/image-carousel';
import ExpandableDescription from '@/src/components/expandable-description';

type MenuCategory = { id: string; name: string };
type MenuProduct = {
  id: string;
  name: string;
  slug: string;
  shortDescription?: string | null;
  description?: string | null;
  categoryId: string;
  price: number;
  discountPrice?: number | null;
  image?: string | null;
  images?: string[];
  isAvailable?: boolean;
  tags?: string[];
};

function documentId(product: { id: string }) {
  return product.id;
}

export default function MenuCatalog({
  categories,
  products,
}: {
  categories: MenuCategory[];
  products: MenuProduct[];
  bookingNumber?: string | null;
}) {
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');

  const visibleProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesCategory = !category || product.categoryId === category;
      const searchText = `${product.name} ${product.shortDescription || ''} ${product.description || ''} ${(product.tags || []).join(' ')}`.toLowerCase();
      return matchesCategory && searchText.includes(query.trim().toLowerCase());
    });
  }, [category, products, query]);

  return (
    <>
      <section className="space-y-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-600">Browse menu</p>
            <h2 className="mt-1 text-xl font-semibold text-stone-900">Find your next favourite</h2>
          </div>

          <label className="relative block w-full lg:max-w-sm">
            <span className="sr-only">Search menu</span>
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-stone-400">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search pizzas, sides, and more"
              className="w-full rounded-2xl border border-stone-300 bg-stone-50 py-3 pl-10 pr-4 text-sm outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-100"
            />
          </label>
        </div>

        <div className="flex gap-2 overflow-x-auto border-t border-stone-100 pt-4">
          {[{ id: '', name: 'All' }, ...categories].map((item) => (
            <button
              key={item.id || 'all'}
              type="button"
              onClick={() => setCategory(item.id)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
                category === item.id
                  ? 'border-amber-600 bg-amber-600 text-white shadow-sm'
                  : 'border-stone-200 bg-white text-stone-700 hover:border-amber-300 hover:bg-amber-50'
              }`}
            >
              {item.name}
            </button>
          ))}
        </div>
      </section>

      {visibleProducts.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-10 text-center">
          <p className="text-lg font-semibold text-stone-900">No items found</p>
          <p className="mt-2 text-sm text-stone-600">Try another search or category.</p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setCategory('');
            }}
            className="mt-4 rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white"
          >
            Reset filters
          </button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((product) => {
            const id = documentId(product);

            return (
              <article
                key={id}
                className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <Link href={`/menu/${product.slug}`} aria-label={`View details for ${product.name}`} className="absolute inset-0 z-0" />
                <Link href={`/menu/${product.slug}`} aria-label={`View details for ${product.name}`} className="relative z-10 block">
                  <ImageCarousel
                    images={[product.image, ...(product.images || [])]}
                    title={product.name}
                    aspectClassName="aspect-[4/3]"
                  />
                </Link>

                <div className="relative z-10 flex flex-1 flex-col space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-stone-900">{product.name}</h2>
                    {product.discountPrice ? (
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                        Offer
                      </span>
                    ) : null}
                  </div>

                  <ExpandableDescription text={product.shortDescription || product.description} className="min-h-10 text-sm leading-5 text-stone-600" />

                  <div className="mt-auto flex min-h-[3.5rem] items-end justify-between gap-3 pt-3">
                    <div>
                      <p className="text-xl font-bold text-stone-900">₹{product.discountPrice ?? product.price}</p>
                      {product.discountPrice ? (
                        <p className="text-sm text-stone-500 line-through">₹{product.price}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <Link
                      href={`/menu/${product.slug}`}
                      className="inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:from-amber-600 hover:to-orange-600"
                    >
                      Order Now
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
