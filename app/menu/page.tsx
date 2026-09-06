import { getAllCategories, getProductsForCustomer } from '@/src/services/menu-service';
import MenuCatalog from '@/src/components/menu-catalog';

export default async function MenuPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string; bookingNumber?: string }>;
}) {
  const categories = (await getAllCategories()).map((category) => ({
    id: category._id?.toHexString() || category.id || category.slug,
    name: category.name,
  }));
  const products = (await getProductsForCustomer()).map((product) => ({
    id: product._id?.toHexString() || product.id || product.slug,
    name: product.name,
    slug: product.slug,
    description: product.description ?? null,
    shortDescription: product.shortDescription ?? null,
    categoryId: product.categoryId,
    price: product.price,
    discountPrice: product.discountPrice ?? null,
    image: product.image ?? null,
    images: product.images ?? [],
    isAvailable: product.isAvailable !== false,
    isFeatured: product.isFeatured === true,
    displayOrder: product.displayOrder ?? 0,
    preparationTime: product.preparationTime ?? null,
    tags: product.tags ?? [],
  }));
  const params = searchParams ? await searchParams : {};
  const bookingNumber = params.bookingNumber?.trim();

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Pizza Vizza</p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl">Fresh favorites, made for every craving</h1>
        <p className="mt-3 max-w-2xl text-sm leading-5 text-stone-600">Browse our signature pizzas, sides, and comfort favorites designed for quick pickup, express delivery, or a cozy dine-in evening.</p>
      </section>

      <section>
        {bookingNumber ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Ordering food for reservation <strong>{bookingNumber}</strong>.</div> : null}
        <MenuCatalog categories={categories} products={products} bookingNumber={bookingNumber || null} />
      </section>
    </div>
  );
}
