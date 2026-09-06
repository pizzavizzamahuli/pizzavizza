'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export function NotificationBell({ admin = false }: { admin?: boolean }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [pushConfigured, setPushConfigured] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  async function refresh() {
    const response = await fetch('/api/notifications', { cache: 'no-store' });
    if (!response.ok) {
      setItems([]);
      setUnreadCount(0);
      return;
    }
    const data = await response.json() as { data?: NotificationItem[]; unreadCount?: number };
    setItems(data.data || []);
    setUnreadCount(data.unreadCount || 0);
  }

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => { window.clearTimeout(initialRefresh); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    fetch('/api/notifications/push', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then(async (data: { configured?: boolean } | null) => {
      if (!data?.configured) return;
      setPushConfigured(true);
      const registration = await navigator.serviceWorker.getRegistration('/sw.js');
      const subscription = await registration?.pushManager.getSubscription();
      setPushEnabled(Boolean(subscription));
    }).catch(() => undefined);
  }, []);

  async function enablePush() {
    if (!pushConfigured || !('Notification' in window) || !('serviceWorker' in navigator)) return;
    setPushBusy(true);
    try {
      const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
      if (permission !== 'granted') return;
      const keyResponse = await fetch('/api/notifications/push', { cache: 'no-store' });
      const keyData = await keyResponse.json() as { publicKey?: string | null };
      if (!keyData.publicKey) return;
      const registration = await navigator.serviceWorker.ready;
      const normalizedKey = keyData.publicKey.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(keyData.publicKey.length / 4) * 4, '=');
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: Uint8Array.from(atob(normalizedKey), (character) => character.charCodeAt(0)) });
      const json = subscription.toJSON();
      await fetch('/api/notifications/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys, userAgent: navigator.userAgent }) });
      setPushEnabled(true);
    } finally {
      setPushBusy(false);
    }
  }

  async function markAllRead() {
    await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) });
    await refresh();
  }

  async function openNotification(item: NotificationItem) {
    if (!item.readAt) {
      await fetch(`/api/notifications/${item._id}`, { method: 'PATCH' });
      setItems((current) => current.map((entry) => entry._id === item._id ? { ...entry, readAt: new Date().toISOString() } : entry));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
  }

  return (
    <div className="relative">
      <button type="button" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 bg-white text-lg text-stone-700 transition hover:border-amber-300 hover:bg-amber-50">
        <span aria-hidden="true">&#128276;</span>
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-4 text-white">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>
      {open ? <div className={`fixed left-3 right-3 top-[4.5rem] z-[60] max-h-[calc(100vh-6rem)] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:max-h-none sm:w-[min(22rem,calc(100vw-2rem))] ${admin ? 'lg:w-96' : ''}`}>
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3"><div><h2 className="font-semibold text-stone-900">Notifications</h2><p className="text-xs text-stone-500">{unreadCount} unread</p></div><button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-amber-700 hover:text-amber-900">Mark all read</button></div>
        {pushConfigured && !pushEnabled ? <div className="border-b border-amber-100 bg-amber-50 px-4 py-3"><p className="text-xs text-amber-900">Stay updated with order and account notifications.</p><button type="button" onClick={() => void enablePush()} disabled={pushBusy} className="mt-2 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{pushBusy ? 'Enabling…' : 'Enable notifications'}</button></div> : null}
        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto sm:max-h-96">
          {items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-stone-500">No notifications yet.</p> : items.map((item) => <Link key={item._id} href={item.href || '#'} onClick={() => void openNotification(item)} className={`block border-b border-stone-100 px-4 py-3 transition hover:bg-amber-50 ${item.readAt ? 'bg-white' : 'bg-amber-50/60'}`}><div className="flex gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-stone-200' : 'bg-amber-600'}`} /><span className="min-w-0"><strong className="block text-sm text-stone-900">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-stone-600">{item.message}</span><time className="mt-1 block text-[11px] text-stone-400">{new Date(item.createdAt).toLocaleString()}</time></span></div></Link>)}
        </div>
        <Link href={admin ? '/admin/notifications' : '/account/notifications'} onClick={() => setOpen(false)} className="block border-t border-stone-100 px-4 py-3 text-center text-sm font-semibold text-amber-700 hover:bg-stone-50">View notification history</Link>
      </div> : null}
    </div>
  );
}
