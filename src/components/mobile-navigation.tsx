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
        <nav className="mt-3 grid gap-1 rounded-2xl border border-stone-200 bg-stone-50 p-2" aria-label="Mobile navigation">
          {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className="min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold text-stone-700 hover:bg-white">{item.label}</Link>)}
          {isAdminUser ? <Link href="/admin" onClick={() => setOpen(false)} className="min-h-11 rounded-xl bg-amber-50 px-3 py-2.5 text-sm font-semibold text-amber-700">Admin dashboard</Link> : null}
        </nav>
      ) : null}
    </div>
  );
}
