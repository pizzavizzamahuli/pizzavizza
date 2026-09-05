'use client';

import { useState } from 'react';
import AddToCartButton from '@/src/components/add-to-cart-button';
import QuantityControl from '@/src/components/quantity-control';

export default function ProductPurchaseControls({ productId, bookingNumber }: { productId: string; bookingNumber?: string | null }) {
  const [quantity, setQuantity] = useState(1);
  return <div className="flex flex-wrap items-center gap-3"><QuantityControl quantity={quantity} onChange={async (next) => setQuantity(Math.max(1, next))} /><AddToCartButton productId={productId} bookingNumber={bookingNumber} quantity={quantity} /></div>;
}
