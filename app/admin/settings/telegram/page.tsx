"use client";

import React, { useEffect, useState } from 'react';

type LinkEntry = {
  id: string;
  userId: string;
  telegramUserId?: string | null;
  telegramChatId: string;
  status: string;
  linkedAt?: string | null;
};

export default function TelegramSettingsPage() {
  const [settings, setSettings] = useState<{ telegramEnabled?: boolean; telegramOrderNotificationsEnabled?: boolean; telegramBookingNotificationsEnabled?: boolean } | null>(null);
  const [links, setLinks] = useState<LinkEntry[]>([]);
  const [, setLoading] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [userId, setUserId] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
    fetchLinks();
  }, []);

  async function fetchSettings() {
    const res = await fetch('/api/admin/settings/restaurant');
    const json = await res.json();
    if (json.success) setSettings(json.data);
  }

  async function updateSettings(updates: Record<string, unknown>) {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/settings/restaurant', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) });
      const j = await res.json();
      if (j.success) setSettings(j.data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchLinks() {
    const res = await fetch('/api/admin/telegram/links');
    const j = await res.json();
    if (j.success) setLinks(j.data || []);
  }

  async function generateCodeFor(userId: string) {
    setMessage(null);
    const res = await fetch('/api/admin/telegram/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    const j = await res.json();
    if (j.success) {
      setCode(j.data.code);
      setMessage('Link code generated.');
    } else {
      setMessage(j.error || 'Unable to generate link code.');
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/admin/telegram/links/${id}`, { method: 'DELETE' });
    const j = await res.json();
    if (j.success) fetchLinks();
  }

  async function sendTest(chatId: string) {
    const res = await fetch('/api/admin/telegram/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId }) });
    const j = await res.json();
    alert(j.success ? 'Test sent' : `Failed: ${j.error || 'unknown'}`);
  }

  return (
    <div className="mx-auto min-w-0 max-w-4xl space-y-5 p-4 sm:space-y-6 sm:p-8">
      <h1 className="text-2xl font-semibold">Telegram Integration</h1>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-medium">Integration</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <label className="flex min-h-11 items-start gap-3 rounded-xl border border-stone-200 p-3 text-sm leading-5">
            <input type="checkbox" checked={!!settings?.telegramEnabled} onChange={(e) => updateSettings({ telegramEnabled: e.target.checked })} /> Enable Telegram
          </label>
          <label className="flex min-h-11 items-start gap-3 rounded-xl border border-stone-200 p-3 text-sm leading-5">
            <input type="checkbox" checked={!!settings?.telegramOrderNotificationsEnabled} onChange={(e) => updateSettings({ telegramOrderNotificationsEnabled: e.target.checked })} /> Order notifications
          </label>
          <label className="flex min-h-11 items-start gap-3 rounded-xl border border-stone-200 p-3 text-sm leading-5">
            <input type="checkbox" checked={!!settings?.telegramBookingNotificationsEnabled} onChange={(e) => updateSettings({ telegramBookingNotificationsEnabled: e.target.checked })} /> Booking notifications
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-medium">Linked Telegram Admins</h2>
        <div className="mt-4 space-y-3">
          {links.length === 0 && <div className="text-sm text-stone-500">No linked Telegram chats yet.</div>}
          {links.map((l) => (
            <div key={l.id} className="flex flex-col gap-3 rounded-xl border border-stone-200 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="font-medium">Chat: {l.telegramChatId}</div>
                <div className="text-sm text-stone-500">Status: {l.status} • User: {l.userId}</div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex">
                <button onClick={() => sendTest(l.telegramChatId)} className="min-h-10 rounded-full bg-amber-600 px-3 py-2 text-sm font-semibold text-white">Send test</button>
                <button onClick={() => revoke(l.id)} className="min-h-10 rounded-full border border-stone-300 px-3 py-2 text-sm font-semibold">Revoke</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <h2 className="font-medium">Generate one-time link code</h2>
        <p className="text-sm text-stone-500">Enter application user id to generate a one-time linking code for that admin.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input id="userId" value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="User ID" className="min-h-11 min-w-0 rounded-xl border border-stone-300 px-3 py-2" />
          <button type="button" onClick={() => { if (userId.trim()) void generateCodeFor(userId.trim()); }} disabled={!userId.trim()} className="min-h-11 rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Generate</button>
        </div>
        {message ? <p className="mt-3 text-sm text-stone-600" role="status">{message}</p> : null}
        {code && (
          <div className="mt-4 rounded border bg-stone-50 p-3">
            <div className="text-sm text-stone-500">One-time code (copy and paste into Telegram):</div>
            <div className="mt-2 font-medium">{code}</div>
          </div>
        )}
      </section>
    </div>
  );
}
