/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { CustomerShell } from '@/src/app-shell';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

const experienceCards = [
  { href: '/menu', title: 'Browse the menu', description: 'Discover pizzas, sides, and chef specials.' },
  { href: '/dining', title: 'Reserve a table', description: 'Book a room or dining experience for your next visit.' },
  { href: '/account/orders', title: 'Track your orders', description: 'Follow live order status and payment updates.' },
];

export default async function Home() {
  const restaurantSettings = await getRestaurantSettings();
  return (
    <CustomerShell>
      <section className="grid gap-6 rounded-3xl border border-stone-200 bg-white p-8 shadow-sm lg:grid-cols-[1.3fr_0.7fr] lg:p-10">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Fresh customer experience</p>
          <h2 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            Order, dine, and manage everything in one place.
          </h2>
          <p className="mt-4 max-w-2xl text-lg text-stone-600">
            Pizza Vizza now brings menu browsing, checkout, dining reservations, wallet credits, and order history into a connected experience for customers.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/menu" className="rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700">
              Explore menu
            </Link>
            <Link href="/account" className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100">
              Go to account
            </Link>
          </div>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-6">
          <h3 className="text-lg font-semibold text-stone-900">What customers can do</h3>
          <ul className="mt-4 space-y-3 text-sm text-stone-600">
            <li>• Place orders with real-time cart checkout</li>
            <li>• Reserve dining rooms and manage bookings</li>
            <li>• Track payments, wallet credits, and referrals</li>
            <li>• Review order history and account details</li>
          </ul>
        </div>
      </section>

      <section className="mt-8 grid gap-4 md:grid-cols-3">
        {experienceCards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-3xl border border-stone-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300">
            <h3 className="text-lg font-semibold text-stone-900">{card.title}</h3>
            <p className="mt-2 text-sm text-stone-600">{card.description}</p>
          </Link>
        ))}
      </section>

      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Restaurant menu</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900">See what is cooking today</h2>
          </div>
          {restaurantSettings.googleMapsUrl ? (
            <a href={restaurantSettings.googleMapsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-200">
              Open restaurant map
            </a>
          ) : null}
        </div>
        <Link href="/menu-image" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Open Full Menu</Link>
        {restaurantSettings.menuImage ? (
          <figure className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50">
            <img src={restaurantSettings.menuImage} alt={`${restaurantSettings.restaurantName} restaurant menu`} className="block h-auto w-full object-contain" />
          </figure>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-12 text-center text-sm text-stone-600">
            The restaurant menu will appear here soon.
          </div>
        )}
      </section>
    </CustomerShell>
  );
}
