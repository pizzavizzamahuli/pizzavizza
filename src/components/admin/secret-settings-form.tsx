"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import React, { useEffect, useState } from 'react';

export default function SecretSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<any>({});
  const [form, setForm] = useState({ razorpayKeySecret: '', telegramBotToken: '', cloudinaryApiSecret: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/admin/settings/secrets');
        const data = await res.json();
        if (mounted && data.success) setStatus(data.data || {});
      } catch (e) {
        console.error(e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      const payload: any = {};
      if (form.razorpayKeySecret) payload.razorpayKeySecret = form.razorpayKeySecret;
      if (form.telegramBotToken) payload.telegramBotToken = form.telegramBotToken;
      if (form.cloudinaryApiSecret) payload.cloudinaryApiSecret = form.cloudinaryApiSecret;

      const res = await fetch('/api/admin/settings/secrets', { method: 'PUT', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Failed');
      alert('Secrets updated. Values are not shown for security.');
      setForm({ razorpayKeySecret: '', telegramBotToken: '', cloudinaryApiSecret: '' });
      setStatus(data.data || {});
    } catch (e: any) {
      alert('Save failed: ' + (e?.message || String(e)));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading secrets status...</div>;

  return (
    <div className="space-y-3">
      <p className="text-sm">For security, secret values are not displayed. Enter a value to set or replace. Leave blank to keep existing.</p>
      <div>
        <label className="block text-sm">Razorpay Secret</label>
        <input className="input w-full" value={form.razorpayKeySecret} onChange={(e) => setForm({ ...form, razorpayKeySecret: e.target.value })} placeholder={status.razorpayKeySecretSet ? 'Configured' : 'Not configured'} />
      </div>
      <div>
        <label className="block text-sm">Telegram Bot Token</label>
        <input className="input w-full" value={form.telegramBotToken} onChange={(e) => setForm({ ...form, telegramBotToken: e.target.value })} placeholder={status.telegramBotTokenSet ? 'Configured' : 'Not configured'} />
      </div>
      <div>
        <label className="block text-sm">Cloudinary API Secret</label>
        <input className="input w-full" value={form.cloudinaryApiSecret} onChange={(e) => setForm({ ...form, cloudinaryApiSecret: e.target.value })} placeholder={status.cloudinaryApiSecretSet ? 'Configured' : 'Not configured'} />
      </div>
      <div>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Secrets'}</button>
      </div>
    </div>
  );
}
