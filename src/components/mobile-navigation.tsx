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
        <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="min-h-11 rounded-full border border-stone-300 bg-white px-4 text-sm font-semibold text-stone-800">
          {open ? 'Close' : 'Menu'}
        </button>
        <Link href="/cart" className="inline-flex min-h-11 items-center rounded-full bg-stone-900 px-4 text-sm font-semibold text-white">
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
