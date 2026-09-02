'use client';

import { useEffect, useState } from 'react';

export default function WalletAdminPanel() {
  const [wallets, setWallets] = useState<Array<Record<string, unknown>>>([]);
  const [userId, setUserId] = useState('');
  const [amount, setAmount] = useState('100');
  const [direction, setDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT');
  const [reason, setReason] = useState('Manual adjustment');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/admin/wallet').then((r) => r.json()).then((j) => setWallets(j.data || [])).catch(() => setWallets([]));
  }, []);

  async function saveWalletAdjustment() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/admin/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, amount: direction === 'DEBIT' ? -Math.abs(Number(amount)) : Math.abs(Number(amount)), reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed to update wallet');
      setMessage(`Wallet updated: ${json.data.balance}`);
      setUserId('');
      setAmount('100');
      setDirection('CREDIT');
      setReason('Manual adjustment');
      const refreshed = await fetch('/api/admin/wallet');
      const refreshedJson = await refreshed.json();
      setWallets(refreshedJson.data || []);
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Failed to update wallet');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Adjust wallet</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block">User ID</span>
            <input value={userId} onChange={(e) => setUserId(e.target.value)} className="w-full rounded border px-3 py-2" placeholder="Consumer user ID" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Action</span>
            <select value={direction} onChange={(e) => setDirection(e.target.value as 'CREDIT' | 'DEBIT')} className="w-full rounded border px-3 py-2">
              <option value="CREDIT">Add balance</option>
              <option value="DEBIT">Deduct balance</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block">Amount</span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded border px-3 py-2" />
          </label>
          <label className="text-sm md:col-span-2">
            <span className="mb-1 block">Reason</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="w-full rounded border px-3 py-2" />
          </label>
        </div>
        <button onClick={saveWalletAdjustment} disabled={saving} className="mt-4 rounded bg-amber-600 px-4 py-2 text-white">{saving ? 'Saving…' : direction === 'DEBIT' ? 'Deduct wallet balance' : 'Add wallet balance'}</button>
        {message && <p className="mt-3 text-sm text-stone-700">{message}</p>}
      </div>

      <div className="rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="text-lg font-semibold">Wallet balances</h2>
        <div className="mt-4 space-y-3">
          {wallets.length === 0 ? <p className="text-sm text-stone-600">No wallet balances yet.</p> : wallets.map((wallet) => (
            <div key={String(wallet._id || wallet.userId)} className="rounded border border-stone-200 p-3">
              <div className="flex justify-between gap-3">
                <div>
                  <div className="font-medium">{String(wallet.userCode || 'ID unavailable')}</div>
                  <div className="text-sm text-stone-700">{String(wallet.userName || 'Consumer')}</div>
                  <div className="text-sm text-stone-600">Currency: {String(wallet.currency || 'INR')}</div>
                </div>
                <div className="text-sm font-medium">₹{Number(wallet.balance || 0).toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
