'use client';

import Link from 'next/link';
import { useState } from 'react';

type Availability = { status: 'OPEN' | 'CLOSED'; reasonMessage: string; openTime: string | null; closeTime: string | null; timezone: string };

export default function RestaurantAvailabilityCard({ initialAvailability, canManage }: { initialAvailability: Availability; canManage: boolean }) {
  const [availability, setAvailability] = useState(initialAvailability);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function update(override: 'OPEN' | 'CLOSED' | null) {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch('/api/admin/settings/restaurant/availability', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ override, reason: override === 'CLOSED' ? reason : null }) });
      const json = await response.json();
      if (!response.ok || !json.success) throw new Error(json.error || 'Unable to update restaurant status');
      setAvailability(json.data.availability);
      setMessage(override === 'CLOSED' ? 'Restaurant closed.' : override === 'OPEN' ? 'Restaurant opened.' : 'Schedule restored.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to update restaurant status');
    } finally {
      setBusy(false);
    }
  }

  return <section className={`rounded-3xl border p-5 shadow-sm ${availability.status === 'OPEN' ? 'border-emerald-200 bg-emerald-50' : 'border-rose-200 bg-rose-50'}`}>
    <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Restaurant status</p><h2 className={`mt-1 text-xl font-semibold ${availability.status === 'OPEN' ? 'text-emerald-800' : 'text-rose-800'}`}>{availability.status === 'OPEN' ? '🟢 Restaurant is OPEN' : '🔴 Restaurant is CLOSED'}</h2><p className="mt-1 text-sm text-stone-700">{availability.reasonMessage}</p>{availability.openTime && availability.closeTime ? <p className="mt-1 text-sm text-stone-600">Today: {availability.openTime} - {availability.closeTime} ({availability.timezone})</p> : null}</div><Link href="/admin/settings" className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-800 shadow-sm">Manage hours</Link></div>
    {canManage ? <div className="mt-4 flex flex-wrap items-center gap-2"><button type="button" disabled={busy} onClick={() => void update('OPEN')} className="min-h-10 rounded-full bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Open restaurant</button><button type="button" disabled={busy} onClick={() => void update('CLOSED')} className="min-h-10 rounded-full bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Close restaurant</button><button type="button" disabled={busy} onClick={() => void update(null)} className="min-h-10 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 disabled:opacity-50">Follow schedule</button><input aria-label="Closure reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Optional closure reason" className="min-h-10 min-w-48 flex-1 rounded-full border border-stone-300 bg-white px-3 py-2 text-sm" /></div> : null}
    {message ? <p className="mt-3 text-sm text-stone-700" role="status">{message}</p> : null}
  </section>;
}
