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
    const res = await fetch('/api/admin/telegram/link', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId }) });
    const j = await res.json();
    if (j.success) setCode(j.data.code);
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
    <div className="mx-auto max-w-4xl p-8 space-y-6">
      <h1 className="text-2xl font-semibold">Telegram Integration</h1>

      <section className="rounded-2xl border p-6 bg-white">
        <h2 className="font-medium">Integration</h2>
        <div className="mt-4 flex items-center gap-4">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!settings?.telegramEnabled} onChange={(e) => updateSettings({ telegramEnabled: e.target.checked })} /> Enable Telegram
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!settings?.telegramOrderNotificationsEnabled} onChange={(e) => updateSettings({ telegramOrderNotificationsEnabled: e.target.checked })} /> Order notifications
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={!!settings?.telegramBookingNotificationsEnabled} onChange={(e) => updateSettings({ telegramBookingNotificationsEnabled: e.target.checked })} /> Booking notifications
          </label>
        </div>
      </section>

      <section className="rounded-2xl border p-6 bg-white">
        <h2 className="font-medium">Linked Telegram Admins</h2>
        <div className="mt-4 space-y-3">
          {links.length === 0 && <div className="text-sm text-stone-500">No linked Telegram chats yet.</div>}
          {links.map((l) => (
            <div key={l.id} className="flex items-center justify-between border rounded p-3">
              <div>
                <div className="font-medium">Chat: {l.telegramChatId}</div>
                <div className="text-sm text-stone-500">Status: {l.status} • User: {l.userId}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => sendTest(l.telegramChatId)} className="rounded bg-amber-600 px-3 py-1 text-white">Send test</button>
                <button onClick={() => revoke(l.id)} className="rounded border px-3 py-1">Revoke</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border p-6 bg-white">
        <h2 className="font-medium">Generate one-time link code</h2>
        <p className="text-sm text-stone-500">Enter application user id to generate a one-time linking code for that admin.</p>
        <div className="mt-4 flex gap-2">
          <input id="userId" placeholder="user id" className="border p-2 rounded flex-1" />
          <button onClick={() => { const v = (document.getElementById('userId') as HTMLInputElement).value; if (v) generateCodeFor(v); }} className="rounded bg-amber-600 px-3 py-1 text-white">Generate</button>
        </div>
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
