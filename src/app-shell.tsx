/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { getSessionUser } from '@/src/auth/session';
import { getCartForUser } from '@/src/services/cart-service';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import MobileNavigation from '@/src/components/mobile-navigation';

const navItems = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: 'Menu' },
  { href: '/dining', label: 'Dining' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account', label: 'Account' },
];

export async function CustomerShell({ children }: { children: React.ReactNode }) {
  let user = null;
  let cart = null;
  let restaurantSettings = null;

  try {
    user = await getSessionUser();
  } catch {
    user = null;
  }

  const isAdminUser = !!user && ['MAIN_ADMIN', 'ADMIN', 'MANAGER', 'KITCHEN_STAFF', 'DELIVERY_STAFF'].includes(user.role);
  const userId = user?._id?.toHexString() || user?.id || null;

  try {
    cart = userId ? await getCartForUser(userId) : null;
  } catch {
    cart = null;
  }

  try {
    restaurantSettings = await getRestaurantSettings();
  } catch {
    restaurantSettings = null;
  }

  const cartCount = cart?.items?.reduce((total, item) => total + item.quantity, 0) ?? 0;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900">
      <header className="border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex min-w-0 items-center gap-2.5">
            <Link href="/" className="flex min-w-0 items-center gap-2.5">
              {restaurantSettings?.logo ? <img src={restaurantSettings.logo} alt={`${restaurantSettings.restaurantName} logo`} className="h-9 w-9 shrink-0 rounded-full border border-amber-100 object-cover sm:h-10 sm:w-10" /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-600 text-sm font-semibold text-white sm:h-10 sm:w-10">PV</div>}
              <div>
                <p className="truncate text-xs font-semibold uppercase tracking-[0.18em] text-amber-600 sm:text-sm sm:tracking-[0.25em]">{restaurantSettings?.restaurantName || 'Pizza Vizza'}</p>
                <h1 className="truncate text-sm font-semibold sm:text-lg">Order online • Dine • Pickup</h1>
              </div>
            </Link>
            {restaurantSettings?.googleMapsUrl ? (
              <a href={restaurantSettings.googleMapsUrl} target="_blank" rel="noreferrer" className="hidden rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-[11px] font-semibold text-stone-700 transition hover:bg-stone-100 sm:inline-flex">
                Map
              </a>
            ) : null}
          </div>
          <nav className="hidden items-center gap-1 text-sm font-medium text-stone-700 md:flex">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href} className="rounded-full px-3 py-2 transition hover:bg-stone-100 hover:text-stone-950">
                {item.label}
              </Link>
            ))}
            {isAdminUser ? (
              <Link href="/admin" className="rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-amber-700 transition hover:bg-amber-100">
                Admin dashboard
              </Link>
            ) : null}
            <Link href="/cart" className="rounded-full bg-stone-900 px-3 py-2 text-white transition hover:bg-stone-700">
              Cart {cartCount > 0 ? `(${cartCount})` : ''}
            </Link>
          </nav>
          <MobileNavigation cartCount={cartCount} isAdminUser={isAdminUser} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">{children}</main>
      <footer className="border-t border-stone-200 bg-white/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-6 text-sm text-stone-600 sm:flex-row sm:items-center sm:justify-between">
          <span>Pizza Vizza brings your menu, dining reservations, and orders into one place.</span>
          <div className="flex flex-wrap gap-3">
            <Link href="/privacy-policy">Privacy</Link>
            <Link href="/terms-and-conditions">Terms</Link>
            <Link href="/refund-cancellation-policy">Refunds</Link>
            <Link href="/delivery-policy">Delivery</Link>
          </div>
          <span>{user ? `Signed in as ${user.name}` : 'Guest experience'}</span>
        </div>
      </footer>
    </div>
  );
}
