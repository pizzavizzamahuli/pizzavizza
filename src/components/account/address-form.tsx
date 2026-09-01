'use client';

import React, { useState } from 'react';

interface AddressFormState {
  label?: string;
  fullName?: string;
  mobile?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export default function AddressForm({ onCreated }: { onCreated?: () => void }): React.ReactElement {
  const [form, setForm] = useState<AddressFormState>({ label: '', fullName: '', mobile: '', addressLine1: '', city: '', state: '', postalCode: '', country: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function change(k: keyof AddressFormState, v: string) { setForm((s) => ({ ...s, [k]: v })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch('/api/account/addresses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setMessage('Address saved');
      setForm({ label: '', fullName: '', mobile: '', addressLine1: '', city: '', state: '', postalCode: '', country: '' });
      if (onCreated) onCreated();
    } catch (err: unknown) {
      const m = err instanceof Error ? err.message : String(err);
      setMessage(m || 'Error');
    } finally { setLoading(false); }
  }

  return (
    <form onSubmit={submit} className="grid gap-2">
      <input value={form.label} onChange={(e) => change('label', e.target.value)} placeholder="Label (Home, Work)" className="rounded border px-3 py-2" />
      <input value={form.fullName} onChange={(e) => change('fullName', e.target.value)} placeholder="Full name" required className="rounded border px-3 py-2" />
      <input value={form.mobile} onChange={(e) => change('mobile', e.target.value)} placeholder="Mobile" required className="rounded border px-3 py-2" />
      <input value={form.addressLine1} onChange={(e) => change('addressLine1', e.target.value)} placeholder="Address line 1" required className="rounded border px-3 py-2" />
      <input value={form.city} onChange={(e) => change('city', e.target.value)} placeholder="City" required className="rounded border px-3 py-2" />
      <input value={form.state} onChange={(e) => change('state', e.target.value)} placeholder="State" required className="rounded border px-3 py-2" />
      <input value={form.postalCode} onChange={(e) => change('postalCode', e.target.value)} placeholder="Postal code" required className="rounded border px-3 py-2" />
      <input value={form.country} onChange={(e) => change('country', e.target.value)} placeholder="Country" required className="rounded border px-3 py-2" />
      <div className="pt-2">
        <button className="rounded bg-amber-600 px-4 py-2 text-white" disabled={loading}>{loading ? 'Saving…' : 'Save address'}</button>
      </div>
      {message && <div className="text-sm text-stone-700">{message}</div>}
    </form>
  );
}
