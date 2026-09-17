/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { CustomerShell } from '@/src/app-shell';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';
import { generateMapLink } from '@/src/services/map-provider';
import { getProductsForCustomer } from '@/src/services/menu-service';
import { getAvailableDiningRooms } from '@/src/services/dining-service';
import AddToCartButton from '@/src/components/add-to-cart-button';
import ImageCarousel from '@/src/components/image-carousel';
import { getRestaurantAvailability } from '@/src/services/restaurant-availability';

function restaurantAddress(settings: Awaited<ReturnType<typeof getRestaurantSettings>>) {
  return [settings.addressLine1, settings.addressLine2, settings.landmark, settings.city, settings.state, settings.postalCode].filter(Boolean).join(', ');
}

export default async function Home() {
  const restaurantSettings = await getRestaurantSettings();
  const [products, diningRooms] = await Promise.all([
    getProductsForCustomer().catch(() => []),
    getAvailableDiningRooms().catch(() => []),
  ]);
  const featuredProducts = products.filter((product) => product.isFeatured).slice(0, 4);
  const menuProducts = featuredProducts.length ? featuredProducts : products.slice(0, 4);
  const address = restaurantAddress(restaurantSettings);
  const whatsappNumber = restaurantSettings.whatsappSupportNumber?.replace(/\D/g, '');
  const restaurantMapUrl = typeof restaurantSettings.latitude === 'number' && typeof restaurantSettings.longitude === 'number'
    ? generateMapLink(restaurantSettings.latitude, restaurantSettings.longitude, restaurantSettings.restaurantName)
    : null;
  const availability = getRestaurantAvailability(restaurantSettings);

  return (
    <CustomerShell>
      <section className="grid gap-6 overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm sm:rounded-3xl lg:grid-cols-[1.08fr_0.92fr]">
        <div className="p-5 sm:p-8 lg:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Welcome to {restaurantSettings.restaurantName}</p>
          <h1 className="mt-3 text-3xl font-semibold leading-[1.08] tracking-tight text-stone-900 sm:text-5xl">Freshly made. Deliciously served.</h1>
          <p className="mt-4 max-w-2xl text-base leading-6 text-stone-600 sm:text-lg">{restaurantSettings.homepageImages?.[0]?.description || restaurantSettings.homeDescription || 'Order your favorite pizzas, enjoy a comfortable dine-in experience, or have a hot meal delivered to your doorstep.'}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/menu" className="rounded-full bg-amber-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-700">Explore Menu</Link>
            {diningRooms.length ? <Link href="/dining" className="rounded-full border border-stone-300 px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-100">Book a Table</Link> : null}
          </div>
          <div className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm font-medium text-stone-600">
            {restaurantSettings.deliveryEnabled ? <span>Delivery</span> : null}
            {restaurantSettings.pickupEnabled ? <span>Pickup</span> : null}
            {diningRooms.length ? <span>Dine-in</span> : null}
          </div>
        </div>
        <div className="min-h-56 bg-stone-100 lg:min-h-full">
          {restaurantSettings.homepageImages?.length ? <ImageCarousel images={restaurantSettings.homepageImages.map((image) => image.imageUrl)} captions={restaurantSettings.homepageImages.map((image) => image.description)} title={`${restaurantSettings.restaurantName} homepage`} aspectClassName="aspect-[4/3] h-full" imageClassName="object-contain" /> : restaurantSettings.homeImage || restaurantSettings.menuImage ? <img src={restaurantSettings.homeImage || restaurantSettings.menuImage || ''} alt={`${restaurantSettings.restaurantName} homepage`} className="block h-auto max-h-[28rem] min-h-56 w-full object-contain lg:max-h-none" /> : <div className="flex min-h-56 items-center justify-center p-8 text-center text-sm text-stone-500">Fresh food and warm hospitality await.</div>}
        </div>
      </section>

      <section className={`mt-4 rounded-2xl border px-4 py-3 text-sm sm:px-5 ${availability.status === 'OPEN' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-rose-200 bg-rose-50 text-rose-800'}`}><p className="font-semibold">{availability.status === 'OPEN' ? '🟢 Restaurant is currently open' : '🔴 Restaurant is currently closed'}</p><p className="mt-1">{availability.reasonMessage}{availability.openTime && availability.closeTime ? ` Today: ${availability.openTime} - ${availability.closeTime}.` : ''}</p></section>

      {menuProducts.length ? <section className="mt-6 sm:mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">From our kitchen</p><h2 className="mt-2 text-2xl font-semibold text-stone-900 sm:text-3xl">Popular picks</h2><p className="mt-2 text-sm text-stone-600">Fresh favorites made to order.</p></div>
          <Link href="/menu" className="text-sm font-semibold text-amber-700">View full menu</Link>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {menuProducts.map((product) => { const productId = product._id?.toHexString() || product.id || product.slug; return <article key={productId} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            {product.image || product.images?.length ? <ImageCarousel images={[product.image, ...(product.images || [])]} title={product.name} aspectClassName="aspect-[4/3]" /> : <div className="flex aspect-[4/3] items-center justify-center bg-stone-100 text-sm text-stone-500">Pizza Vizza</div>}
            <div className="p-4"><h3 className="font-semibold text-stone-900">{product.name}</h3><p className="mt-1 min-h-10 text-sm leading-5 text-stone-600">{product.shortDescription || product.description || 'Made fresh to order.'}</p><div className="mt-3 flex items-center justify-between gap-2"><span className="font-semibold text-stone-900">₹{product.discountPrice ?? product.price}</span><Link href={`/menu/${product.slug}`} className="text-sm font-semibold text-amber-700">View Details</Link></div><div className="mt-3"><AddToCartButton productId={productId} disabled={product.isAvailable === false} /></div></div>
          </article>; })}
        </div>
      </section> : null}

      <section className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-4">
        <Link href="/menu" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300"><p className="text-2xl" aria-hidden="true">🍕</p><h2 className="mt-3 font-semibold text-stone-900">Order Online</h2><p className="mt-1 text-sm text-stone-600">Choose your favorites and customize your meal.</p></Link>
        {restaurantSettings.deliveryEnabled ? <Link href="/checkout" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300"><p className="text-2xl" aria-hidden="true">🛵</p><h2 className="mt-3 font-semibold text-stone-900">Fast Delivery</h2><p className="mt-1 text-sm text-stone-600">Enjoy Pizza Vizza wherever you are.</p></Link> : null}
        {restaurantSettings.pickupEnabled ? <Link href="/menu" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300"><p className="text-2xl" aria-hidden="true">🥡</p><h2 className="mt-3 font-semibold text-stone-900">Easy Pickup</h2><p className="mt-1 text-sm text-stone-600">Order ahead and collect it when ready.</p></Link> : null}
        {diningRooms.length ? <Link href="/dining" className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-amber-300"><p className="text-2xl" aria-hidden="true">🍽️</p><h2 className="mt-3 font-semibold text-stone-900">Dine With Us</h2><p className="mt-1 text-sm text-stone-600">Reserve a dining room for your next visit.</p></Link> : null}
      </section>

      {diningRooms.length ? <section className="mt-6 sm:mt-8"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Dine with us</p><h2 className="mt-2 text-2xl font-semibold text-stone-900">Make it a special occasion</h2></div><Link href="/dining" className="text-sm font-semibold text-amber-700">Explore dining</Link></div><div className="mt-4 grid gap-4 md:grid-cols-2">{diningRooms.slice(0, 2).map((room) => <Link key={room._id?.toHexString() || room.slug} href={`/dining/${room.slug}`} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:border-amber-300"><ImageCarousel images={room.images} title={room.name} aspectClassName="aspect-[16/8]" /><div className="p-4"><h3 className="font-semibold text-stone-900">{room.name}</h3><p className="mt-1 text-sm text-stone-600">{room.shortDescription || room.description}</p></div></Link>)}</div></section> : null}

      <section className="mt-6 grid gap-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:mt-8 sm:rounded-3xl sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(17rem,0.9fr)] lg:items-start">
        <div className="min-w-0"><p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">About {restaurantSettings.restaurantName}</p><h2 className="mt-2 text-2xl font-semibold text-stone-900 sm:text-3xl">{restaurantSettings.aboutHeading || 'Good food, made for good company.'}</h2><p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-6 text-stone-600">{restaurantSettings.aboutDescription || 'Drop in for a relaxed meal, order your favorites online, or let us bring the taste of Pizza Vizza to you.'}</p></div>
        {restaurantSettings.aboutImages?.length ? <div className="min-w-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50"><ImageCarousel images={restaurantSettings.aboutImages.map((image) => image.imageUrl)} captions={restaurantSettings.aboutImages.map((image) => image.description)} title={`${restaurantSettings.restaurantName} About`} aspectClassName="aspect-[4/3] sm:aspect-[16/10]" /></div> : null}
        <div className="space-y-3 text-sm text-stone-600"><h3 className="font-semibold text-stone-900">Restaurant Information</h3>{restaurantSettings.workingHours ? <p><span className="font-medium text-stone-900">Hours:</span> {restaurantSettings.workingHours}</p> : null}{address ? <p><span className="font-medium text-stone-900">Location:</span> {address}</p> : null}<div className="flex flex-wrap gap-3">{restaurantMapUrl ? <a href={restaurantMapUrl} target="_blank" rel="noreferrer" className="font-semibold text-amber-700">Open map</a> : null}{restaurantSettings.supportEmail ? <a href={`mailto:${restaurantSettings.supportEmail}`} className="font-semibold text-amber-700">Contact support</a> : null}{whatsappNumber ? <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noreferrer" className="font-semibold text-amber-700">WhatsApp us</a> : null}</div></div>
      </section>

      <section className="mt-6 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:mt-8 sm:rounded-3xl sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Our Menu</p>
            <h2 className="mt-2 text-2xl font-semibold text-stone-900">A taste of {restaurantSettings.restaurantName}</h2>
          </div>
          {restaurantMapUrl ? (
            <a href={restaurantMapUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center rounded-full bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-200">
              Open restaurant map
            </a>
          ) : null}
        </div>
        <Link href="/menu-image" className="mt-4 inline-flex min-h-11 items-center rounded-full border border-stone-300 px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Open Full Menu</Link>
        {restaurantSettings.menuImage && restaurantSettings.menuImage !== 'null' ? (
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
