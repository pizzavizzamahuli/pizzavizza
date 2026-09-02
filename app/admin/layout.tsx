import Link from 'next/link';
import type { Metadata } from 'next';
import { getSessionUser } from '@/src/auth/session';

export const metadata: Metadata = {
  title: 'Pizza Vizza Admin',
  description: 'Administrative foundation for Pizza Vizza',
};

const navItems = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Operations Center', href: '/admin/operations' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Customers', href: '/admin/customers' },
  { label: 'Menu', href: '/admin/menu' },
  { label: 'Dining Rooms', href: '/admin/dining' },
  { label: 'Payments', href: '/admin/payments' },
  { label: 'Coupons', href: '/admin/coupons' },
  { label: 'Bookings', href: '/admin/bookings' },
  { label: 'Delivery', href: '/admin/delivery' },
  { label: 'Wallet', href: '/admin/wallet' },
  { label: 'Referrals', href: '/admin/referrals' },
  { label: 'Reports', href: '/admin/reports' },
  { label: 'Settings', href: '/admin/settings' },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  const isAdminUser = !!user && ['MAIN_ADMIN', 'ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'].includes(user.role);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-stone-200 bg-white/90 p-3 lg:w-72 lg:border-b-0 lg:border-r lg:p-4">
          <div className="mb-4 lg:mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Pizza Vizza</p>
            <h1 className="text-lg font-semibold lg:text-xl">Operations Hub</h1>
            <p className="mt-1 hidden text-sm text-stone-600 lg:mt-2 lg:block">Manage menu, orders, service operations, and store settings in one place.</p>
          </div>
          <nav className="flex gap-2 overflow-x-auto pb-1 lg:block lg:space-y-2">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block min-h-11 shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 hover:text-stone-950 lg:min-h-0 lg:py-2"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="flex-1">
          <header className="border-b border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-amber-600">Control centre</p>
                <h2 className="text-lg font-semibold">Administration</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {isAdminUser ? (
                  <Link href="/" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">
                    Consumer dashboard
                  </Link>
                ) : null}
                <div className="rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-600">
                  Live access
                </div>
              </div>
            </div>
          </header>
          <main className="min-w-0 p-3 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
