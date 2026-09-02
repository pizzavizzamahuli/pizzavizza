import Link from 'next/link';
import { CustomerShell } from '@/src/app-shell';
import { getRestaurantSettings } from '@/src/models/restaurant-settings';

export default async function RestaurantMenuViewer() {
  const settings = await getRestaurantSettings();

  return (
    <CustomerShell>
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Restaurant menu</p>
            <h1 className="mt-2 text-2xl font-semibold text-stone-900 sm:text-3xl">{settings.restaurantName} menu</h1>
          </div>
          <Link href="/" className="min-h-11 rounded-full border border-stone-300 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50">Back to home</Link>
        </div>
        {settings.menuImage ? (
          <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-sm sm:p-4">
            <img src={settings.menuImage} alt={`${settings.restaurantName} restaurant menu`} className="mx-auto block h-auto w-full object-contain" />
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center text-sm text-stone-600">The restaurant menu will appear here soon.</div>
        )}
      </div>
    </CustomerShell>
  );
}
