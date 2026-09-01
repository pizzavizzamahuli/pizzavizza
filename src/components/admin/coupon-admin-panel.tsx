'use client';

import { useEffect, useState } from 'react';

export default function CouponAdminPanel() {
  const [coupons, setCoupons] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({
    code: '',
    description: '',
    discountType: 'PERCENTAGE',
    discountValue: '10',
    minimumOrderAmount: '0',
    maximumDiscount: '',
    startAt: '',
    endAt: '',
    usageLimit: '',
    perUserLimit: '',
    isActive: true,
    scopeType: 'ALL',
    scopeValues: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/coupons').then((r) => r.json()).then((j) => setCoupons(j.data || [])).catch(() => setCoupons([]));
  }, []);

  async function saveCoupon() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          discountValue: Number(form.discountValue),
          minimumOrderAmount: Number(form.minimumOrderAmount),
          maximumDiscount: form.maximumDiscount ? Number(form.maximumDiscount) : null,
          startAt: form.startAt ? new Date(form.startAt) : new Date(),
          endAt: form.endAt ? new Date(form.endAt) : new Date(Date.now() + 86400000),
          usageLimit: form.usageLimit ? Number(form.usageLimit) : null,
          perUserLimit: form.perUserLimit ? Number(form.perUserLimit) : null,
          scopeValues: (form.scopeValues || '').split(',').map((s) => s.trim()).filter(Boolean),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create coupon');
      setMessage(`Coupon ${json.data.code} saved`);
      setForm({ ...form, code: '', description: '', discountValue: '10', minimumOrderAmount: '0', maximumDiscount: '', startAt: '', endAt: '', usageLimit: '', perUserLimit: '', scopeValues: '', isActive: true });
      const refreshed = await fetch('/api/admin/coupons');
      const refreshedJson = await refreshed.json();
      setCoupons(refreshedJson.data || []);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to save coupon');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Create coupon</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block">Code</span>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="WELCOME10" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Description</span>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="Welcome offer" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Discount type</span>
            <select value={form.discountType} onChange={(e) => setForm({ ...form, discountType: e.target.value })} className="w-full rounded border px-3 py-2">
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed amount</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Discount value</span>
            <input value={form.discountValue} onChange={(e) => setForm({ ...form, discountValue: e.target.value })} className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Minimum order</span>
            <input value={form.minimumOrderAmount} onChange={(e) => setForm({ ...form, minimumOrderAmount: e.target.value })} className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Max discount</span>
            <input value={form.maximumDiscount} onChange={(e) => setForm({ ...form, maximumDiscount: e.target.value })} className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Start</span>
            <input type="datetime-local" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">End</span>
            <input type="datetime-local" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Usage limit</span>
            <input value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Per user limit</span>
            <input value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block">Scope values</span>
            <input value={form.scopeValues} onChange={(e) => setForm({ ...form, scopeValues: e.target.value })} className="w-full rounded border px-3 py-2" placeholder="category-slug,product-id" />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
          Active
        </label>
        <button onClick={saveCoupon} disabled={saving} className="mt-4 rounded bg-amber-600 px-4 py-2 text-white">{saving ? 'Saving…' : 'Create coupon'}</button>
        {message && <p className="mt-3 text-sm text-stone-700">{message}</p>}
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Existing coupons</h2>
        <div className="mt-4 space-y-3">
          {coupons.length === 0 ? <p className="text-sm text-stone-600">No coupons yet.</p> : coupons.map((coupon) => (
            <div key={String(coupon._id || coupon.id)} className="rounded border border-stone-200 p-3">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-medium">{String(coupon.code)}</div>
                  <div className="text-sm text-stone-600">{String(coupon.description || '')}</div>
                </div>
                <div className="text-sm text-stone-600">{String(coupon.discountType)} {String(coupon.discountValue)}</div>
              </div>
              <div className="mt-2 text-xs text-stone-500">Used: {String(coupon.usedCount || 0)} • Active: {String(coupon.isActive)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
