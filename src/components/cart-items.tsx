/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import type { CartItem } from '@/src/models/cart';
import QuantityControl from '@/src/components/quantity-control';

export default function CartItems({ items, onItemsChange }: { items: CartItem[]; onItemsChange?: (items: CartItem[]) => void }) {
  const [cartItems, setCartItems] = useState(items);
  async function update(item: CartItem, quantity: number) {
    const response = await fetch('/api/cart', { method: quantity === 0 ? 'DELETE' : 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(quantity === 0 ? { itemKey: item.itemKey || item.productId } : { itemKey: item.itemKey || item.productId, quantity }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to update cart.');
    setCartItems((current) => quantity === 0 ? current.filter((entry) => (entry.itemKey || entry.productId) !== (item.itemKey || item.productId)) : current.map((entry) => entry === item ? { ...entry, quantity } : entry));
    onItemsChange?.(quantity === 0 ? cartItems.filter((entry) => (entry.itemKey || entry.productId) !== (item.itemKey || item.productId)) : cartItems.map((entry) => entry === item ? { ...entry, quantity } : entry));
    window.dispatchEvent(new CustomEvent('cart-updated'));
  }
  return <ul className="mt-6 space-y-4">{cartItems.map((item) => <li key={item.itemKey || item.productId} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm"><div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start"><div className="flex min-w-0 flex-1 items-start gap-4">{item.image ? <img src={item.image} alt={item.name || 'Cart item'} className="h-20 w-20 flex-shrink-0 rounded-2xl object-cover" /> : <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center rounded-2xl bg-stone-100 text-sm text-stone-500">No image</div>}<div className="min-w-0 flex-1"><div className="break-words text-lg font-semibold leading-6 text-stone-900">{item.name || 'Item'}</div>{item.selectedOptions?.length ? <div className="mt-2 space-y-1 break-words text-sm leading-5 text-stone-600">{item.selectedOptions.map((option) => <div key={option.optionId}><span className="font-medium">{option.groupName}</span>: {option.optionName}</div>)}</div> : null}<div className="mt-3"><QuantityControl quantity={item.quantity} onChange={(next) => update(item, next)} /></div></div></div><div className="flex shrink-0 items-center justify-between gap-4 border-t border-stone-100 pt-3 sm:min-w-32 sm:flex-col sm:items-end sm:border-t-0 sm:pt-1"><div className="text-base font-semibold text-stone-900">₹{(item.unitPrice || 0).toFixed(2)}</div><div className="text-sm text-stone-500">Total ₹{((item.unitPrice || 0) * item.quantity).toFixed(2)}</div></div></div></li>)}</ul>;
}