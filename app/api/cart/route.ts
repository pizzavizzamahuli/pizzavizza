import { NextResponse } from 'next/server';
import { getSessionUser, parseSessionToken } from '@/src/auth/session';
import { CartItem } from '@/src/models/cart';
import { getCartForUser, addToCart, updateCartItemQuantity, removeCartItem, clearUserCart, setCartItems } from '@/src/services/cart-service';

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ success: true, data: null });
  const cart = await getCartForUser(user._id!.toHexString());
  return NextResponse.json({ success: true, data: cart });
}

export async function POST(request: Request) {
  // Determine acting user ID: prefer session-aware server lookup, fallback to
  // best-effort token parsing for test/harness flows.
  const user = await getSessionUser(request);
  let userIdForAction: string | undefined;

  if (!user) {
    const tokenFromHeader = request.headers.get('x-pizzavizza-session') || request.headers.get('x-session-token');
    const cookieHeader = request.headers.get('cookie');
    let token = tokenFromHeader;
    if (!token && cookieHeader) {
      const match = cookieHeader.split(';').map((s) => s.trim()).find((s) => s.startsWith('pizzavizza_session='));
      if (match) token = match.split('=').slice(1).join('=');
    }

    if (token) {
      const parsed = await parseSessionToken(token);
      if (parsed) {
        try {
          const { getUserById, isUserEligibleForSession } = await import('@/src/services/user-service');
          const userDoc = await getUserById(parsed);
          if (userDoc && isUserEligibleForSession(userDoc)) {
            userIdForAction = parsed;
          }
        } catch {
          // ignore and treat as unauthenticated
        }
      }
    }

    if (!userIdForAction) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  } else {
    userIdForAction = user._id!.toHexString();
  }

  const payload = await request.json();
  try {
    const body = payload as Record<string, unknown>;
    if (Array.isArray(body.items)) {
      type SetCartItemPayload = {
        productId: string;
        quantity: number;
        selectedOptions?: Array<{ optionId: string }>;
        selectedOptionIds?: string[];
      };
      const items = body.items as Array<SetCartItemPayload>;
      const formattedItems = items.map((item) => {
        const selectedOptionIds = Array.isArray(item.selectedOptionIds)
          ? item.selectedOptionIds.filter((id) => typeof id === 'string')
          : Array.isArray(item.selectedOptions)
          ? (item.selectedOptions as Array<{ optionId: string }>).
              filter((opt) => opt && typeof opt.optionId === 'string')
              .map((opt) => opt.optionId)
          : [];
        return {
          productId: item.productId,
          quantity: item.quantity,
          selectedOptions: selectedOptionIds.map((optionId) => ({
            groupId: '',
            groupName: '',
            optionId,
            optionName: '',
            price: 0,
          })),
        };
      });
      const res = await setCartItems(userIdForAction, formattedItems as CartItem[]);
      return NextResponse.json({ success: true, data: res });
    }

    const productId = typeof body.productId === 'string' ? (body.productId as string) : '';
    const quantity = typeof body.quantity === 'number' ? (body.quantity as number) : Number(body.quantity || 1);
    const selectedOptions = Array.isArray(body.selectedOptions)
      ? (body.selectedOptions as Array<{ optionId: string }>).
          filter((opt) => opt && typeof opt.optionId === 'string')
          .map((opt) => opt.optionId)
      : [];
    const res = await addToCart(userIdForAction, productId, Number(quantity || 1), selectedOptions);
    return NextResponse.json({ success: true, data: res });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || 'Failed to update cart' }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const payload = await request.json();
  try {
    const body = payload as Record<string, unknown>;
    const itemKey = typeof body.itemKey === 'string' ? body.itemKey : typeof body.productId === 'string' ? body.productId : '';
    const quantity = typeof body.quantity === 'number' ? body.quantity : Number(body.quantity);
    const res = await updateCartItemQuantity(user._id!.toHexString(), itemKey, Math.floor(Number(quantity)));
    return NextResponse.json({ success: true, data: res });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || 'Failed to update cart' }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  try {
    const body = payload as Record<string, unknown>;
    const itemKey = typeof body.itemKey === 'string' ? body.itemKey : typeof body.productId === 'string' ? body.productId : undefined;
    if (itemKey) {
      await removeCartItem(user._id!.toHexString(), itemKey);
      return NextResponse.json({ success: true });
    }
    await clearUserCart(user._id!.toHexString());
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg || 'Failed to clear cart' }, { status: 400 });
  }
}
