import Link from 'next/link';
import { CustomerShell } from '@/src/app-shell';

const experienceCards = [
  { href: '/menu', title: 'Browse the menu', description: 'Discover pizzas, sides, and chef specials.' },
  { href: '/dining', title: 'Reserve a table', description: 'Book a room or dining experience for your next visit.' },
  { href: '/account/orders', title: 'Track your orders', description: 'Follow live order status and payment updates.' },
];

export default function Home() {
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
    </CustomerShell>
  );
}
