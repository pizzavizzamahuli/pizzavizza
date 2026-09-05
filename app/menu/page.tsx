import { getAllCategories, getProductsForCustomer } from '@/src/services/menu-service';
import { ProductDocument } from '@/src/models/product';
import { CategoryDocument } from '@/src/models/category';
import MenuCatalog from '@/src/components/menu-catalog';

export default async function MenuPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; bookingNumber?: string }>;
}) {
  const categories: CategoryDocument[] = await getAllCategories();
  const products: ProductDocument[] = await getProductsForCustomer();
  const params = searchParams ? await searchParams : {};
  const bookingNumber = params.bookingNumber?.trim();

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Pizza Vizza</p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl">Fresh favourites, made for every craving</h1>
        <p className="mt-3 max-w-2xl text-sm leading-5 text-stone-600">Browse our signature pizzas, sides, and comfort favourites designed for quick pickup, express delivery, or a cozy dine-in evening.</p>
      </section>

      <section>
        {bookingNumber ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Ordering food for reservation <strong>{bookingNumber}</strong>.</div> : null}
        <MenuCatalog categories={categories} products={products} bookingNumber={bookingNumber || null} />
      </section>
    </div>
  );
}
