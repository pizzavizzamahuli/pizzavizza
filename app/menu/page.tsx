import Link from 'next/link';
import { getAllCategories, getProductsForCustomer } from '@/src/services/menu-service';
import { ProductDocument } from '@/src/models/product';
import { CategoryDocument } from '@/src/models/category';
import AddToCartButton from '@/src/components/add-to-cart-button';
import ImageCarousel from '@/src/components/image-carousel';

export default async function MenuPage({
  searchParams,
}: {
  searchParams?: Promise<{ category?: string }>; 
}) {
  const categories: CategoryDocument[] = await getAllCategories();
  const products: ProductDocument[] = await getProductsForCustomer();
  const params = searchParams ? await searchParams : {};
  const selectedCategory = params.category?.trim();
  const bookingNumber = (params as { bookingNumber?: string }).bookingNumber?.trim();

  const visibleProducts = selectedCategory
    ? products.filter((product) => product.categoryId === selectedCategory)
    : products;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:rounded-3xl sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Pizza Vizza</p>
        <h1 className="mt-3 text-2xl font-semibold leading-tight text-stone-900 sm:text-3xl">Fresh favourites, made for every craving</h1>
        <p className="mt-3 max-w-2xl text-sm leading-5 text-stone-600">Browse our signature pizzas, sides, and comfort favourites designed for quick pickup, express delivery, or a cozy dine-in evening.</p>
      </section>

      <section>
        {bookingNumber ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">Ordering food for reservation <strong>{bookingNumber}</strong>. <Link href={`/cart?bookingNumber=${encodeURIComponent(bookingNumber)}`} className="font-semibold underline">View reservation cart</Link></div> : null}
        <div className="flex gap-3 overflow-x-auto py-2">
          <Link
            href="/menu"
            className={`rounded-full border px-3 py-2 text-sm font-semibold ${!selectedCategory ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`}
          >
            All
          </Link>
          {categories.map((category) => {
            const categoryId = category._id?.toHexString() || category.slug;
            const isActive = selectedCategory === categoryId;

            return (
              <Link
                key={categoryId}
                href={{ pathname: '/menu', query: { category: categoryId } }}
                className={`rounded-full border px-3 py-2 text-sm font-medium ${isActive ? 'border-amber-600 bg-amber-600 text-white' : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'}`}
              >
                {category.name}
              </Link>
            );
          })}
        </div>
      </section>

      <section>
        {visibleProducts.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-8 text-center text-stone-600 shadow-sm">
            <p className="text-lg font-medium text-stone-800">No items in this category yet.</p>
            <Link href="/menu" className="mt-3 inline-block text-sm font-semibold text-amber-700">
              View all menu items
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visibleProducts.map((p) => (
              <article key={p._id?.toHexString()} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
                <ImageCarousel images={[p.image, ...(p.images || [])]} title={p.name} aspectClassName="aspect-[4/3]" />
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-semibold text-stone-900">{p.name}</h3>
                    {p.discountPrice ? <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">Offer</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-stone-600">{p.shortDescription || p.description}</p>
                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <div className="text-lg font-semibold text-stone-900">₹{p.discountPrice ?? p.price}</div>
                      {p.discountPrice ? <div className="text-sm text-stone-500 line-through">₹{p.price}</div> : null}
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <AddToCartButton productId={p._id?.toHexString() || p.slug} bookingNumber={bookingNumber || null} />
                    <Link href={`/menu/${p._id?.toHexString() || p.slug}${bookingNumber ? `?bookingNumber=${encodeURIComponent(bookingNumber)}` : ''}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-stone-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-stone-700">View details</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
