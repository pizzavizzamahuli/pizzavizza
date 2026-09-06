import Link from 'next/link';
import type { Metadata } from 'next';
import { requireAdminPanelAccess } from '@/src/auth/guard';
import { AuthorizationService, type PermissionName } from '@/src/config/permissions';
import { NotificationBell } from '@/src/components/notifications/notification-bell';
import { displayLabel } from '@/src/utils/display-labels';

export const metadata: Metadata = { title: 'Pizza Vizza Admin', description: 'Administrative foundation for Pizza Vizza' };

const navSections: Array<{ label: string; items: Array<{ label: string; href: string; permission?: PermissionName; mainAdminOnly?: boolean }> }> = [
  { label: 'Overview', items: [{ label: 'Dashboard', href: '/admin' }] },
  { label: 'Operations', items: [
    { label: 'Operations Center', href: '/admin/operations', permission: 'orders.view' },
    { label: 'Orders', href: '/admin/orders', permission: 'orders.view' },
    { label: 'Bookings', href: '/admin/bookings', permission: 'bookings.view' },
    { label: 'Delivery', href: '/admin/delivery', permission: 'delivery.view' },
  ] },
  { label: 'Catalog', items: [{ label: 'Menu', href: '/admin/menu', permission: 'menu.view' }, { label: 'Dining Rooms', href: '/admin/dining', permission: 'bookings.view' }] },
  { label: 'Customers', items: [{ label: 'Customers', href: '/admin/customers', permission: 'customers.view' }, { label: 'Wallet', href: '/admin/wallet', permission: 'wallet.view' }, { label: 'Referrals', href: '/admin/referrals', permission: 'referrals.view' }, { label: 'Coupons', href: '/admin/coupons', permission: 'coupons.view' }] },
  { label: 'Payments', items: [{ label: 'Payments', href: '/admin/payments', permission: 'payments.view' }] },
  { label: 'System', items: [{ label: 'Reports', href: '/admin/reports', permission: 'orders.view' }, { label: 'Notifications', href: '/admin/notifications' }, { label: 'Telegram', href: '/admin/settings/telegram', mainAdminOnly: true }, { label: 'Settings', href: '/admin/settings', permission: 'settings.view' }] },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPanelAccess();
  const visibleSections = navSections.map((section) => ({ ...section, items: section.items.filter((item) => (!item.mainAdminOnly || user.role === 'MAIN_ADMIN') && (!item.permission || AuthorizationService.canAccess(user.role, item.permission, user.permissions))) })).filter((section) => section.items.length);

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="w-full border-b border-stone-200 bg-white/90 p-3 lg:w-72 lg:border-b-0 lg:border-r lg:p-4">
          <div className="mb-4 lg:mb-6"><p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Pizza Vizza</p><h1 className="text-lg font-semibold lg:text-xl">Operations Hub</h1><p className="mt-1 hidden text-sm text-stone-600 lg:mt-2 lg:block">Manage menu, orders, service operations, and store settings in one place.</p></div>
          <nav className="flex gap-4 overflow-x-auto pb-1 lg:block lg:space-y-5">{visibleSections.map((section) => <div key={section.label} className="shrink-0 lg:space-y-1"><p className="hidden px-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-400 lg:block">{section.label}</p><div className="flex gap-2 lg:block">{section.items.map((item) => <Link key={item.href} href={item.href} className="block min-h-11 shrink-0 rounded-lg px-3 py-2.5 text-sm font-medium text-stone-700 transition hover:bg-stone-100 hover:text-stone-950 lg:min-h-0 lg:py-2">{item.label}</Link>)}</div></div>)}</nav>
        </aside>
        <div className="flex-1">
          <header className="border-b border-stone-200 bg-white px-4 py-4 shadow-sm sm:px-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-medium text-amber-600">Control centre</p><h2 className="text-lg font-semibold">Administration</h2></div><div className="flex flex-wrap items-center gap-2"><Link href="/" className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">Customer dashboard</Link><NotificationBell admin /><div className="rounded-full border border-stone-200 px-3 py-1 text-sm text-stone-600">{displayLabel(user.role)}</div></div></div></header>
          <main className="min-w-0 p-3 sm:p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
