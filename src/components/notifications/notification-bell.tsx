'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { NotificationPopupStyle } from '@/src/types/appearance';

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  href?: string | null;
  readAt?: string | null;
  createdAt: string;
};

function getPopupClasses(style: NotificationPopupStyle, admin: boolean) {
  const base = 'fixed inset-x-3 top-16 z-[80] max-h-[calc(100dvh-5rem)] overflow-hidden rounded-2xl border shadow-2xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-2 sm:max-h-none sm:w-[min(22rem,calc(100vw-2rem))]';
  const adminClass = admin ? 'lg:w-96' : '';

  if (style === 'light-glass') {
    return `${base} border-white/60 bg-white/70 backdrop-blur-xl ${adminClass}`;
  }

  if (style === 'dark-glass') {
    return `${base} border-stone-700/80 bg-stone-950/70 text-stone-100 backdrop-blur-xl ${adminClass}`;
  }

  if (style === 'premium-material') {
    return `${base} border-amber-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,247,237,0.94),rgba(254,243,199,0.82),rgba(255,237,213,0.7))] shadow-[0_28px_70px_rgba(120,53,15,0.2)] ring-1 ring-amber-200/80 ${adminClass}`;
  }

  return `${base} border-stone-200 bg-white ${adminClass}`;
}

function getPopupInnerClasses(style: NotificationPopupStyle) {
  if (style === 'dark-glass') {
    return 'border-b border-stone-700/80 text-stone-100';
  }

  if (style === 'premium-material') {
    return 'border-b border-amber-200/80';
  }

  return 'border-b border-stone-100/80';
}

function getRowClasses(style: NotificationPopupStyle, read: boolean) {
  if (style === 'dark-glass') {
    return `block border-b border-stone-700/70 px-4 py-3 transition ${read ? 'bg-stone-900/50' : 'bg-amber-500/10 hover:bg-amber-500/15'}`;
  }

  if (style === 'premium-material') {
    return `block border-b border-amber-200/80 px-4 py-3 transition ${read ? 'bg-white/35' : 'bg-amber-50/80 hover:bg-amber-100/80'}`;
  }

  return `block border-b border-stone-100/80 px-4 py-3 transition hover:bg-amber-50/70 ${read ? 'bg-white/40' : 'bg-amber-50/60'}`;
}

export function NotificationBell({ admin = false, popupStyle = 'none' }: { admin?: boolean; popupStyle?: NotificationPopupStyle }) {
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

  const popupClasses = getPopupClasses(popupStyle, admin);
  const headerClasses = popupStyle === 'dark-glass'
    ? 'border-stone-700/80 bg-stone-900/70 text-stone-100 shadow-sm backdrop-blur-sm hover:border-amber-400/80 hover:bg-stone-800/80'
    : popupStyle === 'premium-material'
      ? 'border-amber-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.9),rgba(255,247,237,0.9),rgba(255,237,213,0.75))] text-stone-800 shadow-sm hover:border-amber-400'
      : 'border-stone-200/80 bg-white/80 text-stone-700 shadow-sm backdrop-blur-sm hover:border-amber-300 hover:bg-amber-50/90';

  const textClasses = popupStyle === 'dark-glass' ? 'text-stone-100' : popupStyle === 'premium-material' ? 'text-stone-800' : 'text-stone-900';
  const mutedTextClasses = popupStyle === 'dark-glass' ? 'text-stone-300' : popupStyle === 'premium-material' ? 'text-stone-600' : 'text-stone-500';
  const actionTextClasses = popupStyle === 'dark-glass' ? 'text-amber-300 hover:text-amber-200' : popupStyle === 'premium-material' ? 'text-amber-700 hover:text-amber-800' : 'text-amber-700 hover:text-amber-900';
  const historyLinkClasses = popupStyle === 'dark-glass'
    ? 'block border-t border-stone-700/80 px-4 py-3 text-center text-sm font-semibold text-amber-300 hover:bg-stone-800/80'
    : popupStyle === 'premium-material'
      ? 'block border-t border-amber-200/80 px-4 py-3 text-center text-sm font-semibold text-amber-700 hover:bg-amber-50/80'
      : 'block border-t border-stone-100/80 px-4 py-3 text-center text-sm font-semibold text-amber-700 hover:bg-stone-50/70';

  return (
    <div className="relative z-[70] shrink-0">
      <button type="button" aria-label="Notifications" aria-expanded={open} onClick={() => setOpen((value) => !value)} className={`relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-lg shadow-sm transition ${headerClasses}`}>
        <span aria-hidden="true">&#128276;</span>
        {unreadCount > 0 ? <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-bold leading-4 text-white">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>
      {open ? <div className={popupClasses}>
        <div className={`flex items-center justify-between gap-3 px-4 py-3 ${getPopupInnerClasses(popupStyle)}`}><div><h2 className={`font-semibold ${textClasses}`}>Notifications</h2><p className={`text-xs ${mutedTextClasses}`}>{unreadCount} unread</p></div><div className="flex items-center gap-3"><button type="button" onClick={() => void markAllRead()} className={`text-xs font-semibold ${actionTextClasses}`}>Mark all read</button><button type="button" aria-label="Close notifications" title="Close notifications" onClick={() => setOpen(false)} className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-lg leading-none transition ${popupStyle === 'dark-glass' ? 'text-stone-200 hover:bg-stone-700' : 'text-stone-500 hover:bg-stone-200/70 hover:text-stone-900'}`}><span aria-hidden="true">×</span></button></div></div>
        {pushConfigured && !pushEnabled ? <div className={popupStyle === 'dark-glass' ? 'border-b border-stone-700/80 bg-stone-900/60 px-4 py-3' : popupStyle === 'premium-material' ? 'border-b border-amber-200/80 bg-amber-50/80 px-4 py-3' : 'border-b border-amber-100/80 bg-amber-50/80 px-4 py-3'}><p className={popupStyle === 'dark-glass' ? 'text-xs text-amber-200' : popupStyle === 'premium-material' ? 'text-xs text-amber-900' : 'text-xs text-amber-900'}>Stay updated with order and account notifications.</p><button type="button" onClick={() => void enablePush()} disabled={pushBusy} className="mt-2 rounded-full bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{pushBusy ? 'Enabling…' : 'Enable notifications'}</button></div> : null}
        <div className="max-h-[calc(100vh-13rem)] overflow-y-auto sm:max-h-96">
          {items.length === 0 ? <p className={`px-4 py-8 text-center text-sm ${mutedTextClasses}`}>No notifications yet.</p> : items.map((item) => <Link key={item._id} href={item.href || '#'} onClick={() => void openNotification(item)} className={getRowClasses(popupStyle, Boolean(item.readAt))}><div className="flex gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-stone-200' : 'bg-amber-600'}`} /><span className="min-w-0"><strong className={`block text-sm ${textClasses}`}>{item.title}</strong><span className={`mt-1 block text-xs leading-5 ${popupStyle === 'dark-glass' ? 'text-stone-300' : popupStyle === 'premium-material' ? 'text-stone-600' : 'text-stone-600'}`}>{item.message}</span><time className={`mt-1 block text-[11px] ${popupStyle === 'dark-glass' ? 'text-stone-400' : 'text-stone-400'}`}>{new Date(item.createdAt).toLocaleString()}</time></span></div></Link>)}
        </div>
        <Link href={admin ? '/admin/notifications' : '/account/notifications'} onClick={() => setOpen(false)} className={historyLinkClasses}>View notification history</Link>
      </div> : null}
    </div>
  );
}
