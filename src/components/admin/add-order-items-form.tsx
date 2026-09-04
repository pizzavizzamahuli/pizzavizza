'use client';

import { useState } from 'react';

export default function AddOrderItemsForm({ orderNumber }: { orderNumber: string }) {
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [message, setMessage] = useState('');
  async function submit(event: React.FormEvent) { event.preventDefault(); const response = await fetch(`/api/admin/orders/${orderNumber}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: [{ productId, quantity: Number(quantity) }] }) }); const data = await response.json(); setMessage(response.ok ? `Items added. Amount due: INR ${Number(data.data.amountDue || 0).toFixed(2)}` : data.error || 'Unable to add items.'); }
  return <form onSubmit={submit} className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><h2 className="font-semibold">Add items</h2><div className="mt-3 grid gap-2 sm:grid-cols-[1fr_8rem_auto]"><input required value={productId} onChange={(event) => setProductId(event.target.value)} placeholder="Product ID" className="rounded-xl border px-3 py-2" /><input required type="number" min="1" value={quantity} onChange={(event) => setQuantity(event.target.value)} className="rounded-xl border px-3 py-2" /><button type="submit" className="rounded-xl bg-amber-600 px-4 py-2 text-sm font-semibold text-white">Add item</button></div>{message ? <p className="mt-3 text-sm text-stone-700">{message}</p> : null}</form>;
}
