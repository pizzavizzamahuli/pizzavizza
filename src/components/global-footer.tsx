/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import type { RestaurantSettingsDocument } from '@/src/models/restaurant-settings';

function address(settings: RestaurantSettingsDocument) {
  return [settings.addressLine1, settings.addressLine2, settings.landmark, settings.city, settings.state, settings.postalCode].filter(Boolean).join(', ');
}

export default function GlobalFooter({ settings }: { settings: RestaurantSettingsDocument | null }) {
  const name = settings?.restaurantName || 'Pizza Vizza';
  const restaurantAddress = settings ? address(settings) : '';
  const hasPoweredBy = !!settings?.poweredByName && !!settings?.poweredByUrl;
  const whatsappNumber = settings?.whatsappSupportNumber?.replace(/\D/g, '');

  return (
    <footer className="border-t border-stone-200 bg-stone-950 text-stone-300">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1.35fr_1fr_1fr_1.2fr] lg:gap-8">
        <div>
          <div className="flex items-center gap-3">
            {settings?.logo ? <img src={settings.logo} alt={`${name} logo`} className="h-12 w-12 rounded-full border border-amber-500/40 object-cover" /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500 font-bold text-stone-950">PV</div>}
            <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-400">{name}</p><p className="mt-1 font-semibold text-white">Order online • Dine • Pickup</p></div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-6 text-stone-400">Fresh food, easy ordering, and memorable dining experiences from one place.</p>
        </div>
        <nav aria-label="Quick links"><h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Quick links</h2><div className="mt-4 grid gap-3 text-sm"><Link className="transition hover:text-amber-400" href="/">Home</Link><Link className="transition hover:text-amber-400" href="/menu">Menu</Link><Link className="transition hover:text-amber-400" href="/dining">Dining</Link><Link className="transition hover:text-amber-400" href="/account/orders">Orders</Link><Link className="transition hover:text-amber-400" href="/account">My account</Link></div></nav>
        <nav aria-label="Customer support"><h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Customer support</h2><div className="mt-4 grid gap-3 text-sm">{settings?.supportEmail ? <a className="transition hover:text-amber-400" href={`mailto:${settings.supportEmail}`}>Help &amp; support</a> : null}{whatsappNumber ? <a className="transition hover:text-amber-400" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello ${name}, I need help with my order/account.`)}`} target="_blank" rel="noopener noreferrer">WhatsApp support</a> : null}<Link className="transition hover:text-amber-400" href="/delivery-policy">Delivery</Link><Link className="transition hover:text-amber-400" href="/refund-cancellation-policy">Refund policy</Link><Link className="transition hover:text-amber-400" href="/terms-and-conditions">Terms &amp; conditions</Link><Link className="transition hover:text-amber-400" href="/privacy-policy">Privacy policy</Link></div></nav>
        <div><h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Restaurant</h2><div className="mt-4 grid gap-3 text-sm"><p className="font-medium text-white">{name}</p>{restaurantAddress ? <p>{restaurantAddress}</p> : null}{settings?.phone ? <a className="transition hover:text-amber-400" href={`tel:${settings.phone}`}>{settings.phone}</a> : null}{settings?.email ? <a className="break-all transition hover:text-amber-400" href={`mailto:${settings.email}`}>{settings.email}</a> : null}{settings?.workingHours ? <p>{settings.workingHours}</p> : null}</div></div>
      </div>
      <div className="border-t border-white/10"><div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6"><p>© {new Date().getFullYear()} {name}. All rights reserved.</p>{hasPoweredBy ? <p>Powered by <a href={settings?.poweredByUrl || '#'} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-400 hover:text-amber-300">{settings?.poweredByName}</a></p> : null}</div></div>
    </footer>
  );
}