'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { CartItem } from '@/src/models/cart';
import CartItems from '@/src/components/cart-items';

export default function CartContent({ initialItems, bookingQuery }: { initialItems: CartItem[]; bookingQuery: string }) {
  const [items, setItems] = useState(initialItems);
  const subtotal = items.reduce((sum, item) => sum + (item.unitPrice || 0) * item.quantity, 0);
  return <div className="mx-auto max-w-4xl px-0 py-2 sm:p-8"><div className="flex flex-col gap-6 lg:flex-row lg:items-start"><div className="min-w-0 flex-1"><h1 className="text-2xl font-semibold sm:text-3xl">Your Cart</h1><p className="mt-2 text-sm text-stone-600">Review items, quantities, and selected customizations before checkout.</p><CartItems items={items} onItemsChange={setItems} /></div><aside className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6 lg:sticky lg:top-6"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Order summary</p><div className="mt-5 space-y-3"><div className="flex justify-between text-sm text-stone-500"><span>Items</span><span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span></div><div className="flex justify-between text-sm text-stone-500"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div><div className="flex justify-between text-sm text-stone-500"><span>Delivery</span><span className="text-right">Calculated at checkout</span></div></div><div className="mt-5 border-t border-stone-200 pt-5"><div className="flex justify-between text-sm text-stone-500"><span>Total</span><span className="text-lg font-semibold text-stone-900">₹{subtotal.toFixed(2)}</span></div><Link href={`/checkout${bookingQuery}`} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700">Proceed to checkout</Link></div></aside></div></div>;
}