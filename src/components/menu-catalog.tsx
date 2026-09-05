'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { CategoryDocument } from '@/src/models/category';
import type { ProductDocument } from '@/src/models/product';
import AddToCartButton from '@/src/components/add-to-cart-button';
import ImageCarousel from '@/src/components/image-carousel';
import QuantityControl from '@/src/components/quantity-control';

export default function MenuCatalog({ categories, products, bookingNumber }: { categories: CategoryDocument[]; products: ProductDocument[]; bookingNumber: string | null }) {
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  useEffect(() => { fetch('/api/cart').then((response) => response.json()).then((data) => { const next: Record<string, number> = {}; for (const item of data.data?.items || []) next[item.productId] = item.quantity; setCartQuantities(next); }).catch(() => undefined); }, []);
  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = !category || product.categoryId === category;
    const searchText = `${product.name} ${product.shortDescription || ''} ${product.description || ''} ${(product.tags || []).join(' ')}`.toLowerCase();
    return matchesCategory && searchText.includes(query.trim().toLowerCase());
  }), [category, products, query]);

  async function changeQuantity(product: ProductDocument, quantity: number) {
    const productId = product._id?.toHexString() || product.slug;
    const response = await fetch('/api/cart', { method: quantity === 0 ? 'DELETE' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(quantity === 0 ? { productId } : { productId, quantity }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to update cart.');
    setCartQuantities((current) => ({ ...current, [productId]: quantity }));
  }

  return <>
    <section className="space-y-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3 overflow-x-auto py-1">{[{ id: '', name: 'All' }, ...categories.map((item) => ({ id: item._id?.toHexString() || item.slug, name: item.name }))].map((item) => <button key={item.id || 'all'} type="button" onClick={() => setCategory(item.id)} className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${category === item.id ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-200 bg-white text-stone-700 hover:border-amber-300 hover:bg-amber-50'}`}>{item.name}</button>)}</div><label className="relative block shrink-0 sm:w-72"><span className="sr-only">Search menu</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search menu..." className="w-full rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100" /></label></div></section>
    {visibleProducts.length === 0 ? <div className="rounded-3xl border border-dashed border-stone-300 bg-white p-10 text-center"><p className="text-lg font-semibold text-stone-900">No items found</p><p className="mt-2 text-sm text-stone-600">Try another search or category.</p><button type="button" onClick={() => { setQuery(''); setCategory(''); }} className="mt-4 rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">Reset filters</button></div> : <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{visibleProducts.map((product) => { const id = product._id?.toHexString() || product.slug; const quantity = cartQuantities[id] || 0; return <article key={id} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"><ImageCarousel images={[product.image, ...(product.images || [])]} title={product.name} aspectClassName="aspect-[4/3]" /><div className="space-y-3 p-5"><div className="flex items-start justify-between gap-3"><h2 className="text-lg font-semibold text-stone-900">{product.name}</h2>{product.discountPrice ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Offer</span> : null}</div><p className="min-h-10 text-sm leading-5 text-stone-600">{product.shortDescription || product.description || 'Made fresh to order.'}</p><div className="flex items-end justify-between gap-3"><div><p className="text-xl font-bold text-stone-900">₹{product.discountPrice ?? product.price}</p>{product.discountPrice ? <p className="text-sm text-stone-500 line-through">₹{product.price}</p> : null}</div>{quantity > 0 ? <QuantityControl quantity={quantity} onChange={(next) => changeQuantity(product, next)} disabled={product.isAvailable === false} /> : <AddToCartButton productId={id} bookingNumber={bookingNumber} disabled={product.isAvailable === false} onAdded={() => setCartQuantities((current) => ({ ...current, [id]: 1 }))} />}</div><div className="grid grid-cols-2 gap-2"><Link href={`/menu/${id}${bookingNumber ? `?bookingNumber=${encodeURIComponent(bookingNumber)}` : ''}`} className="col-span-2 inline-flex min-h-11 items-center justify-center rounded-full border border-stone-300 px-3 py-2 text-center text-sm font-semibold text-stone-700 hover:bg-stone-50">View details</Link></div></div></article>; })}</div>}
  </>;
}
