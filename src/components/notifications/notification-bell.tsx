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

  async function refresh() {
    const response = await fetch('/api/notifications', { cache: 'no-store' });
    if (!response.ok) return;
    const data = await response.json() as { data?: NotificationItem[]; unreadCount?: number };
    setItems(data.data || []);
    setUnreadCount(data.unreadCount || 0);
  }

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => { window.clearTimeout(initialRefresh); window.clearInterval(timer); };
  }, []);

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
      {open ? <div className={`absolute right-0 z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-xl ${admin ? 'lg:w-96' : ''}`}>
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3"><div><h2 className="font-semibold text-stone-900">Notifications</h2><p className="text-xs text-stone-500">{unreadCount} unread</p></div><button type="button" onClick={() => void markAllRead()} className="text-xs font-semibold text-amber-700 hover:text-amber-900">Mark all read</button></div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? <p className="px-4 py-8 text-center text-sm text-stone-500">No notifications yet.</p> : items.map((item) => <Link key={item._id} href={item.href || '#'} onClick={() => void openNotification(item)} className={`block border-b border-stone-100 px-4 py-3 transition hover:bg-amber-50 ${item.readAt ? 'bg-white' : 'bg-amber-50/60'}`}><div className="flex gap-2"><span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${item.readAt ? 'bg-stone-200' : 'bg-amber-600'}`} /><span className="min-w-0"><strong className="block text-sm text-stone-900">{item.title}</strong><span className="mt-1 block text-xs leading-5 text-stone-600">{item.message}</span><time className="mt-1 block text-[11px] text-stone-400">{new Date(item.createdAt).toLocaleString()}</time></span></div></Link>)}
        </div>
        <Link href={admin ? '/admin/notifications' : '/account/notifications'} onClick={() => setOpen(false)} className="block border-t border-stone-100 px-4 py-3 text-center text-sm font-semibold text-amber-700 hover:bg-stone-50">View notification history</Link>
      </div> : null}
    </div>
  );
}
