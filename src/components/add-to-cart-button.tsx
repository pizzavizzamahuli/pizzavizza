'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type AddToCartButtonProps = {
  productId: string;
  selectedOptionIds?: string[];
  disabled?: boolean;
  bookingNumber?: string | null;
  onAdded?: () => void;
  quantity?: number;
};

export default function AddToCartButton({ productId, selectedOptionIds = [], disabled, bookingNumber = null, onAdded, quantity = 1 }: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();

  const handleAddToCart = async () => {
    if (!productId) return;
    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          quantity: Math.max(1, Math.floor(quantity)),
          selectedOptions: selectedOptionIds.map((optionId) => ({ optionId })),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error(json.error || 'Failed to add to cart');
      }

      setMessage('Added to cart');
      onAdded?.();
      if (bookingNumber) {
        router.push(`/cart?bookingNumber=${encodeURIComponent(bookingNumber)}`);
        return;
      }
      router.refresh();
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Unable to add to cart');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={disabled || isLoading}
        onClick={handleAddToCart}
        className="inline-flex items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-stone-300"
      >
        {isLoading ? 'Adding…' : 'Add to cart'}
      </button>
      {message ? <p className="text-xs text-stone-500">{message}</p> : null}
    </div>
  );
}
