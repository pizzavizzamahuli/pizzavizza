'use client';

import { useState } from 'react';

export default function QuantityControl({ quantity, onChange, disabled = false }: { quantity: number; onChange: (quantity: number) => Promise<void>; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  async function change(nextQuantity: number) {
    if (busy || disabled || nextQuantity < 0) return;
    setBusy(true);
    try { await onChange(nextQuantity); } finally { setBusy(false); }
  }
  return <div className="inline-flex min-h-11 items-center rounded-full border border-stone-300 bg-white p-1 shadow-sm" aria-label="Quantity control"><button type="button" aria-label="Decrease quantity" disabled={busy || disabled || quantity <= 0} onClick={() => change(quantity - 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40">−</button><span className="min-w-8 text-center text-sm font-semibold text-stone-900" aria-live="polite">{quantity}</span><button type="button" aria-label="Increase quantity" disabled={busy || disabled} onClick={() => change(quantity + 1)} className="flex h-9 w-9 items-center justify-center rounded-full text-lg font-semibold text-stone-700 hover:bg-stone-100 disabled:opacity-40">+</button></div>;
}
