/* eslint-disable @next/next/no-img-element */
import { getSessionUser } from '@/src/auth/session';
import { getCartForUser } from '@/src/services/cart-service';
import Link from 'next/link';

export default async function CartPage({ searchParams }: { searchParams?: Promise<{ bookingNumber?: string }> }) {
  const user = await getSessionUser();
  if (!user) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold">Your Cart</h1>
        <p className="mt-4">You are not signed in. Your cart is stored in your browser until you sign in.</p>
        <p className="mt-4"><Link href="/login" className="text-amber-600">Sign in</Link> to save your cart.</p>
      </div>
    );
  }

  const cart = await getCartForUser(user._id!.toHexString());
  const params = searchParams ? await searchParams : {};
  const bookingQuery = params.bookingNumber ? `?bookingNumber=${encodeURIComponent(params.bookingNumber)}` : '';

  if (!cart || !cart.items || cart.items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <h1 className="text-2xl font-semibold">Your Cart</h1>
        <p className="mt-4">Your cart is empty.</p>
        <p className="mt-4"><Link href="/menu" className="text-amber-600">Continue shopping</Link></p>
      </div>
    );
  }

  const subtotal = cart.items.reduce((s, it) => s + ((it.unitPrice || 0) * it.quantity), 0);

  return (
    <div className="mx-auto max-w-4xl px-0 py-2 sm:p-8">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
        <div className="flex-1">
          <h1 className="text-3xl font-semibold">Your Cart</h1>
          <p className="mt-2 text-sm text-stone-600">Review items, quantities, and selected customizations before checkout.</p>

          <ul className="mt-6 space-y-4">
            {cart.items.map((it) => (
              <li key={it.itemKey || it.productId} className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-sm">
                <div className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <div className="flex min-w-0 items-start gap-4">
                    {it.image ? (
                      <img src={it.image} alt={it.name || 'Cart item'} className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl object-cover" />
                    ) : (
                      <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-stone-100 text-sm text-stone-500">No image</div>
                    )}
                    <div className="min-w-0">
                      <div className="text-lg font-semibold text-stone-900 break-words">{it.name || 'Item'}</div>
                      <div className="mt-1 text-sm text-stone-500">Qty: {it.quantity}</div>
                      {it.selectedOptions && it.selectedOptions.length > 0 ? (
                        <div className="mt-3 space-y-1 text-sm text-stone-600 break-words">
                          {it.selectedOptions.map((option) => (
                            <div key={option.optionId} className="break-words">
                              <span className="font-medium">{option.groupName}</span>: {option.optionName}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                  <div className="text-right min-w-[8rem] whitespace-nowrap text-sm sm:text-base">
                    <div className="text-base font-semibold text-stone-900">₹{(it.unitPrice || 0).toFixed(2)}</div>
                    <div className="text-sm text-stone-500">Total ₹{((it.unitPrice || 0) * it.quantity).toFixed(2)}</div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className="w-full max-w-sm rounded-3xl border border-stone-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-amber-600">Order summary</p>
          <div className="mt-6 space-y-3">
            <div className="flex justify-between text-sm text-stone-500">
              <span>Items</span>
              <span>{cart.items.length}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-500">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-stone-500">
              <span>Delivery</span>
              <span>Calculated at checkout</span>
            </div>
          </div>
          <div className="mt-6 border-t border-stone-200 pt-6">
            <div className="flex justify-between text-sm text-stone-500">
              <span>Total</span>
              <span className="text-lg font-semibold text-stone-900">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="mt-6">
              <Link href={`/checkout${bookingQuery}`} className="inline-flex w-full justify-center rounded-full bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700">
                Proceed to checkout
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
