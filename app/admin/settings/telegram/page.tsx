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
  const [showHelp, setShowHelp] = useState(false);
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    fetchSettings();
    fetchLinks();

    const interval = window.setInterval(() => {
      void fetchLinks();
    }, 5000);

    return () => window.clearInterval(interval);
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
      setMessage('Link code generated. Send /link <code> in Telegram and then refresh the status.');
      void fetchLinks();
    } else {
      setMessage(j.error || 'Unable to generate link code.');
    }
  }

  async function revoke(id: string) {
    const res = await fetch(`/api/admin/telegram/links/${id}`, { method: 'DELETE' });
    const j = await res.json();
    if (j.success) fetchLinks();
  }

  async function copyCode() {
    if (!code) return;

    try {
      await navigator.clipboard.writeText(code);
      setCopyStatus('copied');
      window.setTimeout(() => setCopyStatus('idle'), 1500);
    } catch {
      setCopyStatus('idle');
      setMessage('Clipboard access is blocked in this browser. Please copy the code manually.');
    }
  }

  async function sendTest(chatId: string) {
    const res = await fetch('/api/admin/telegram/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chatId }) });
    const j = await res.json();
    alert(j.success ? 'Test sent' : `Failed: ${j.error || 'unknown'}`);
  }

  return (
    <div className="mx-auto min-w-0 max-w-5xl space-y-5 p-4 sm:space-y-6 sm:p-8">
      <div className="rounded-3xl border border-stone-200 bg-gradient-to-br from-stone-50 via-white to-amber-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Telegram Integration</p>
            <h1 className="mt-2 text-2xl font-semibold text-stone-900">Connection status</h1>
          </div>
          <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${links.length > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
            {links.length > 0 ? '🟢 Connected' : '🔴 Not Connected'}
          </span>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm">
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3">
                <span className="text-sm font-medium text-stone-600">Bot Username</span>
                <span className="font-mono text-sm font-semibold text-stone-900">{links[0]?.telegramUserId ? `@${links[0].telegramUserId}` : '__'}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-stone-50 p-3">
                <span className="text-sm font-medium text-stone-600">Admin Chat ID</span>
                <span className="font-mono text-sm font-semibold text-stone-900">{links[0]?.telegramChatId || '__'}</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
            <p className="text-sm font-semibold text-stone-700">Quick actions</p>
            <div className="mt-3 grid gap-2">
              <button type="button" className="min-h-11 rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-50">
                Test Connection
              </button>
              <button type="button" className="min-h-11 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-700">
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      </div>

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-medium">Linked Telegram Admins</h2>
            <p className="mt-1 text-sm text-stone-500">
              Status: <span className={links.length > 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-stone-500'}>{links.length > 0 ? 'Connected' : 'Not connected'}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { void fetchLinks(); }} className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50">Refresh status</button>
            <button type="button" onClick={() => setShowHelp((value) => !value)} className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-stone-300 bg-stone-50 text-base font-semibold text-stone-700 shadow-sm transition hover:bg-stone-100" aria-label="Show Telegram connection help" aria-expanded={showHelp}>
              ?
            </button>
          </div>
        </div>

        {showHelp && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-stone-700">
            <p className="font-medium text-stone-800">How Telegram connection works</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5">
              <li>Open your Telegram bot and tap <span className="font-semibold">Start</span>.</li>
              <li>Enter the website user ID in the field below (this is your public website user code, for example 123456).</li>
              <li>Generate the one-time code and copy it.</li>
              <li>Send <span className="font-semibold">/link &lt;code&gt;</span> inside Telegram.</li>
              <li>Once the bot confirms the link, this page will show the admin as connected.</li>
            </ol>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {links.length === 0 && <div className="text-sm text-stone-500">No linked Telegram chats yet.</div>}
          {links.map((l) => (
            <div key={l.id} className="flex flex-col gap-3 rounded-xl border border-stone-200 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Chat: {l.telegramChatId}</span>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">Connected</span>
                </div>
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
        <p className="text-sm text-stone-500">Enter the website user ID (the public user code, like 123456) to generate a one-time linking code for that admin.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
          <input id="userId" value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="Website user ID" className="min-h-11 min-w-0 rounded-xl border border-stone-300 px-3 py-2" />
          <button type="button" onClick={() => { if (userId.trim()) void generateCodeFor(userId.trim()); }} disabled={!userId.trim()} className="min-h-11 rounded-full bg-amber-600 px-5 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Generate</button>
        </div>
        {message ? <p className="mt-3 text-sm text-stone-600" role="status">{message}</p> : null}
        {code && (
          <div className="mt-4 rounded border bg-stone-50 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm text-stone-500">One-time code (copy and paste into Telegram):</div>
              <button type="button" onClick={() => { void copyCode(); }} className="rounded-full bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-700">
                {copyStatus === 'copied' ? 'Copied' : 'Copy'}
              </button>
            </div>
            <div className="mt-2 font-medium break-all">{code}</div>
          </div>
        )}
      </section>
    </div>
  );
}
