import Link from 'next/link';
import { getSessionUser } from '@/src/auth/session';
import { getCartForUser } from '@/src/services/cart-service';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-4">
          <Link href="/" className="flex items-center gap-3">
            {restaurantSettings?.logo ? <img src={restaurantSettings.logo} alt={`${restaurantSettings.restaurantName} logo`} className="h-10 w-10 rounded-full border border-amber-100 object-cover" /> : <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-600 text-sm font-semibold text-white">PV</div>}
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">{restaurantSettings?.restaurantName || 'Pizza Vizza'}</p>
              <h1 className="text-lg font-semibold">Order online • Dine • Pickup</h1>
            </div>
          </Link>
          <nav className="flex flex-wrap items-center gap-2 text-sm font-medium text-stone-700">
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
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl px-6 py-10">{children}</main>
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
