import { getSessionUser } from '@/src/auth/session';
import { getCartForUser } from '@/src/services/cart-service';
import Link from 'next/link';
import CartContent from '@/src/components/cart-content';

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

  return (
    <CartContent initialItems={cart.items} bookingQuery={bookingQuery} />
  );
}
