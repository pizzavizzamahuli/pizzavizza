'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const BUY_NOW_STORAGE_KEY = 'pizzavizza-buy-now';

type BuyNowButtonProps = {
  productId: string;
  selectedOptions?: Array<{ optionId: string; quantity?: number }>;
  quantity?: number;
  bookingNumber?: string | null;
  disabled?: boolean;
  fullWidth?: boolean;
};

export default function BuyNowButton({ productId, selectedOptions = [], quantity = 1, bookingNumber = null, disabled = false, fullWidth = false }: BuyNowButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  function handleBuyNow() {
    if (!productId || disabled || isLoading) return;
    setIsLoading(true);
    window.sessionStorage.setItem(BUY_NOW_STORAGE_KEY, JSON.stringify({ productId, quantity: Math.max(1, Math.floor(quantity)), selectedOptions }));
    const query = bookingNumber ? `?bookingNumber=${encodeURIComponent(bookingNumber)}` : '';
    router.push(`/checkout${query}`);
  }

  return <button type="button" disabled={disabled || isLoading} onClick={handleBuyNow} className={`inline-flex min-h-11 items-center justify-center rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-emerald-600 hover:to-green-700 disabled:cursor-not-allowed disabled:opacity-50 ${fullWidth ? 'w-full' : ''}`}>{isLoading ? 'Opening checkout...' : 'Buy Now'}</button>;
}