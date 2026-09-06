'use client';

import Link from 'next/link';
import { useState } from 'react';

const items = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/dining', label: 'Dining' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account', label: 'Account' },
];

export default function MobileNavigation({ cartCount, isAdminUser }: { cartCount: number; isAdminUser: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="md:hidden">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setOpen((value) => !value)} aria-label={open ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={open} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-300 bg-white text-stone-800">
          <span aria-hidden="true" className="text-lg leading-none">{open ? '×' : '☰'}</span>
        </button>
        <Link href="/cart" aria-label={`Cart${cartCount > 0 ? `, ${cartCount} items` : ''}`} className="inline-flex h-10 items-center rounded-full bg-stone-900 px-3 text-xs font-semibold text-white">
          Cart{cartCount > 0 ? ` (${cartCount})` : ''}
        </Link>
      </div>
      {open ? (
        <nav className="absolute left-3 right-3 top-[4.5rem] z-40 grid gap-1 rounded-2xl border border-stone-200 bg-white p-2 shadow-xl" aria-label="Mobile navigation">
          {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-white">{item.label}</Link>)}
          {isAdminUser ? <Link href="/admin" onClick={() => setOpen(false)} className="min-h-11 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700">Admin dashboard</Link> : null}
        </nav>
      ) : null}
      <nav className="mobile-safe-bottom fixed inset-x-0 bottom-0 z-40 grid h-[4.5rem] grid-cols-5 border-t border-stone-200 bg-white/95 px-2 pt-1 shadow-[0_-4px_16px_rgb(0_0_0/0.08)] backdrop-blur" aria-label="Quick mobile navigation">
        {items.slice(0, 4).map((item) => <Link key={item.href} href={item.href} className="flex min-h-12 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-semibold text-stone-600 active:bg-amber-50"><span aria-hidden="true" className="mb-0.5 text-base">{item.label === 'Home' ? '⌂' : item.label === 'Menu' ? '☷' : item.label === 'Dining' ? '♨' : '◷'}</span>{item.label}</Link>)}
        <Link href="/cart" className="flex min-h-12 flex-col items-center justify-center rounded-xl px-1 text-[11px] font-semibold text-amber-700 active:bg-amber-50"><span aria-hidden="true" className="mb-0.5 text-base">🛒</span>Cart{cartCount > 0 ? ` (${cartCount})` : ''}</Link>
      </nav>
    </div>
  );
}
