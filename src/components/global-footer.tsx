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
    <footer className="border-t" style={{ backgroundColor: settings?.appearance?.colors.footerBackground || '#0c0a09', color: settings?.appearance?.colors.footerText || '#d6d3d1', borderColor: settings?.appearance?.colors.border || '#e7e5e4' }}>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-7 min-[360px]:grid-cols-2 min-[360px]:gap-x-5 min-[360px]:gap-y-6 sm:gap-10 sm:px-6 sm:py-12 lg:grid-cols-[1.35fr_1fr_1fr_1.2fr] lg:gap-8">
        <div className="min-[360px]:col-span-2 lg:col-span-1">
          <div className="flex items-center gap-2.5 sm:gap-3">
            {settings?.logo ? <img src={settings.logo} alt={`${name} logo`} className="h-10 w-10 rounded-full border object-cover sm:h-12 sm:w-12" style={{ borderColor: settings?.appearance?.colors.footerAccent || '#fbbf24' }} /> : <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold sm:h-12 sm:w-12" style={{ backgroundColor: settings?.appearance?.colors.footerAccent || '#fbbf24', color: settings?.appearance?.colors.footerBackground || '#0c0a09' }}>PV</div>}
            <div><p className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: settings?.appearance?.colors.footerAccent || '#fbbf24' }}>{name}</p><p className="mt-1 font-semibold" style={{ color: settings?.appearance?.colors.heading || '#ffffff' }}>Order online • Dine • Pickup</p></div>
          </div>
          <p className="mt-3 max-w-sm text-sm leading-5 text-stone-400 sm:mt-5 sm:max-w-xs sm:leading-6">Fresh food, easy ordering, and memorable dining experiences from one place.</p>
        </div>
        <nav aria-label="Quick links"><h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Quick links</h2><div className="mt-3 grid gap-1.5 text-sm sm:mt-4 sm:gap-3">{[['/', 'Home'], ['/menu', 'Menu'], ['/dining', 'Dining'], ['/account/orders', 'Orders'], ['/account', 'My account']].map(([href, label]) => <Link key={href} className="flex min-h-8 items-center transition hover:text-amber-400" href={href}>{label}</Link>)}</div></nav>
        <nav aria-label="Customer support"><h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Customer support</h2><div className="mt-3 grid gap-1.5 text-sm sm:mt-4 sm:gap-3">{settings?.supportEmail ? <a className="flex min-h-8 items-center transition hover:text-amber-400" href={`mailto:${settings.supportEmail}`}>Help &amp; support</a> : null}{whatsappNumber ? <a className="flex min-h-8 items-center transition hover:text-amber-400" href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hello ${name}, I need help with my order/account.`)}`} target="_blank" rel="noopener noreferrer">WhatsApp support</a> : null}<Link className="flex min-h-8 items-center transition hover:text-amber-400" href="/delivery-policy">Delivery</Link><Link className="flex min-h-8 items-center transition hover:text-amber-400" href="/refund-cancellation-policy">Refund policy</Link><Link className="flex min-h-8 items-center transition hover:text-amber-400" href="/terms-and-conditions">Terms &amp; conditions</Link><Link className="flex min-h-8 items-center transition hover:text-amber-400" href="/privacy-policy">Privacy policy</Link></div></nav>
        <div className="min-[360px]:col-span-2 lg:col-span-1"><h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Restaurant</h2><div className="mt-3 grid gap-1.5 text-sm sm:mt-4 sm:gap-3"><p className="font-medium text-white">{name}</p>{restaurantAddress ? <p className="break-words">{restaurantAddress}</p> : null}{settings?.email ? <a className="break-all transition hover:text-amber-400" href={`mailto:${settings.email}`}>{settings.email}</a> : null}{settings?.workingHours ? <p>{settings.workingHours}</p> : null}</div></div>
      </div>
      <div className="border-t" style={{ borderColor: `${settings?.appearance?.colors.border || '#e7e5e4'}55` }}><div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-4 text-xs sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:px-6 sm:py-5"><p>© {new Date().getFullYear()} {name}. All rights reserved.</p>{hasPoweredBy ? <p>Powered by <a href={settings?.poweredByUrl || '#'} target="_blank" rel="noopener noreferrer" className="font-semibold" style={{ color: settings?.appearance?.colors.footerAccent || '#fbbf24' }}>{settings?.poweredByName}</a></p> : null}</div></div>
    </footer>
  );
}