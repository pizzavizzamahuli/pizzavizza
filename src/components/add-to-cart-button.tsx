'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type AddToCartButtonProps = {
  productId: string;
  selectedOptionIds?: string[];
  disabled?: boolean;
};

export default function AddToCartButton({ productId, selectedOptionIds = [], disabled }: AddToCartButtonProps) {
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
          quantity: 1,
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
