'use client';

import { useEffect, useState } from 'react';

export default function ReferralAdminPanel() {
  const [referrals, setReferrals] = useState<Array<Record<string, unknown>>>([]);
  const [userId, setUserId] = useState('');
  const [rewardValue, setRewardValue] = useState('50');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/referrals').then((r) => r.json()).then((j) => setReferrals(j.data || [])).catch(() => setReferrals([]));
  }, []);

  async function saveReferral() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, rewardValue: Number(rewardValue) }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to create referral');
      setMessage(`Referral ${json.data.code} created`);
      setUserId('');
      setRewardValue('50');
      const refreshed = await fetch('/api/admin/referrals');
      const refreshedJson = await refreshed.json();
      setReferrals(refreshedJson.data || []);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to save referral');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Create referral</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block">User ID</span>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="Mongo ObjectId" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Reward value</span>
            <input value={rewardValue} onChange={(e) => setRewardValue(e.target.value)} className="w-full rounded border px-3 py-2" />
          </label>
        </div>
        <button onClick={saveReferral} disabled={saving} className="mt-4 rounded bg-amber-600 px-4 py-2 text-white">{saving ? 'Saving…' : 'Create referral'}</button>
        {message && <p className="mt-3 text-sm text-stone-700">{message}</p>}
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Existing referrals</h2>
        <div className="mt-4 space-y-3">
          {referrals.length === 0 ? <p className="text-sm text-stone-600">No referrals yet.</p> : referrals.map((referral) => (
            <div key={String(referral._id || referral.id)} className="rounded border border-stone-200 p-3">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-medium">{String(referral.code)}</div>
                  <div className="text-sm text-stone-600">User: {String(referral.referrerUserId || '')}</div>
                </div>
                <div className="text-sm text-stone-600">{String(referral.status)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
