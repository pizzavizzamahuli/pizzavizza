import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProductBySlug } from '@/src/services/menu-service';
import { findCustomizationGroupsByIds } from '@/src/models/customization-group';
import ProductImageGallery from '@/src/components/product-image-gallery';
import AddToCartButton from '@/src/components/add-to-cart-button';
import ProductCustomizationForm from '@/src/components/product-customization-form';

export default async function ProductPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams?: Promise<{ bookingNumber?: string }> }) {
  const { slug } = await params;
  const bookingNumber = searchParams ? (await searchParams).bookingNumber : null;
  const product = await getProductBySlug(slug);
  if (!product || product.isAvailable === false) {
    notFound();
  }

  const customizationGroups = product.customizationGroupIds?.length
    ? await findCustomizationGroupsByIds(product.customizationGroupIds)
    : [];

  const images = [...(product.image ? [product.image] : []), ...(product.images ?? [])].filter(Boolean);

  return (
    <div className="space-y-4 sm:space-y-6">
      <section className="rounded-xl border bg-white p-4 sm:p-6">
        <div className="grid gap-6 lg:grid-cols-[1.2fr,0.8fr]">
          <ProductImageGallery images={images} title={product.name} />
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-semibold text-stone-900 sm:text-3xl">{product.name}</h1>
              <p className="mt-3 text-sm text-stone-600">{product.description}</p>
            </div>
            <div className="rounded-3xl bg-stone-100 p-5 space-y-4">
              <div className="text-3xl font-semibold text-stone-900">₹{product.discountPrice ?? product.price}</div>
              {product.discountPrice ? <div className="mt-1 text-sm text-stone-500 line-through">₹{product.price}</div> : null}
              <div className="grid gap-2 text-sm text-stone-600">
                <div>Prep time: {product.preparationTime ?? 'N/A'} mins</div>
                <div>Availability: {product.isAvailable ? 'Available' : 'Unavailable'}</div>
              </div>
              <div className="mt-2">
                {customizationGroups.length === 0 ? (
                  <AddToCartButton productId={product._id?.toHexString() || product.slug} bookingNumber={bookingNumber || null} />
                ) : (
                  <div className="rounded-3xl bg-amber-50 p-4 text-sm text-stone-700">
                    Customize this item below before adding it to your cart.
                  </div>
                )}
                {bookingNumber ? <Link href={`/cart?bookingNumber=${encodeURIComponent(bookingNumber)}`} className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-amber-700">View food cart for reservation</Link> : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      {customizationGroups.length > 0 ? (
        <section>
          <ProductCustomizationForm
            productId={product._id?.toHexString() || product.slug}
            groups={customizationGroups.map((group) => ({
              id: group.id || group._id?.toHexString() || '',
              name: group.name,
              description: group.description ?? null,
              required: group.required,
              minSelections: group.minSelections,
              maxSelections: group.maxSelections,
              options: group.options.map((option) => ({
                id: option.id,
                name: option.name,
                price: option.price,
                isActive: option.isActive,
              })),
            }))}
          />
        </section>
      ) : null}
    </div>
  );
}
