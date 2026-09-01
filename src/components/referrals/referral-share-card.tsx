'use client';

import { useMemo, useState } from 'react';

export function ReferralShareCard({ code, rewardValue }: { code: string; rewardValue: number }) {
  const [copied, setCopied] = useState(false);

  const referralLink = useMemo(() => {
    if (typeof window === 'undefined') return `https://yourdomain.com/register?ref=${code}`;
    return `${window.location.origin}/register?ref=${code}`;
  }, [code]);

  const shareText = `Use my Pizza Vizza referral code ${code} and get ₹${rewardValue} in wallet credit when you sign up. ${referralLink}`;

  async function copyText(value: string) {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.alert('Copy failed. Please select and copy manually.');
    }
  }

  async function shareViaWeb() {
    const payload = { title: 'Pizza Vizza referral', text: shareText, url: referralLink };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // Fall through to the manual copy flow.
      }
    }
    await copyText(referralLink);
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
  const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent('Pizza Vizza referral')}&body=${encodeURIComponent(shareText)}`;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
      <p className="text-sm text-stone-600">Code</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-3xl font-semibold tracking-[0.25em] text-stone-900">{code}</p>
        <button type="button" onClick={() => copyText(code)} className="rounded-full bg-stone-900 px-4 py-2 text-sm font-semibold text-white">
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>

      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-4">
        <p className="text-sm text-stone-600">Referral link</p>
        <p className="mt-2 break-all text-sm font-medium text-stone-900">{referralLink}</p>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" onClick={() => copyText(referralLink)} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
          Copy link
        </button>
        <button type="button" onClick={shareViaWeb} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700">
          Share
        </button>
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
          WhatsApp
        </a>
        <a href={telegramUrl} target="_blank" rel="noreferrer" className="rounded-full bg-sky-600 px-3 py-2 text-sm font-semibold text-white">
          Telegram
        </a>
        <a href={emailUrl} className="rounded-full bg-stone-700 px-3 py-2 text-sm font-semibold text-white">
          Email
        </a>
      </div>
    </div>
  );
}
