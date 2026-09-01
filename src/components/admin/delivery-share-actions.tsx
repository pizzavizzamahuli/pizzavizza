'use client';

import { useMemo, useState } from 'react';

type DeliveryShareActionsProps = {
  message: string;
  whatsappNumber?: string | null;
};

function normalizeWhatsAppNumber(value?: string | null) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits || null;
}

export default function DeliveryShareActions({ message, whatsappNumber }: DeliveryShareActionsProps) {
  const [status, setStatus] = useState<string | null>(null);
  const whatsappUrl = useMemo(() => {
    const encoded = encodeURIComponent(message);
    const number = normalizeWhatsAppNumber(whatsappNumber);
    return number ? `https://wa.me/${number}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  }, [message, whatsappNumber]);

  async function copyDetails() {
    try {
      await navigator.clipboard.writeText(message);
      setStatus('Delivery details copied.');
    } catch {
      setStatus('Copy failed. Select the text and copy manually.');
    }
  }

  return (
    <div className="space-y-3">
      <textarea readOnly value={message} className="min-h-56 w-full rounded-2xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700" />
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={copyDetails} className="rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700">
          Copy details
        </button>
        <a href={whatsappUrl} target="_blank" rel="noreferrer" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          Share on WhatsApp
        </a>
      </div>
      {status ? <p className="text-sm text-stone-600">{status}</p> : null}
    </div>
  );
}
