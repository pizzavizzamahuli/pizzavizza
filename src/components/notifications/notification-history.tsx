'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type NotificationItem = { _id: string; title: string; message: string; href?: string | null; readAt?: string | null; createdAt: string };

export function NotificationHistory() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  useEffect(() => { fetch('/api/notifications', { cache: 'no-store' }).then((response) => response.ok ? response.json() : null).then((data) => setItems(data?.data || [])).catch(() => setItems([])); }, []);
  async function markAllRead() { await fetch('/api/notifications', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) }); setItems((current) => current.map((item) => ({ ...item, readAt: new Date().toISOString() }))); }
  return <section className="mx-auto max-w-3xl"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-600">Inbox</p><h1 className="mt-2 text-3xl font-semibold text-stone-900">Notification history</h1></div><button type="button" onClick={() => void markAllRead()} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-100">Mark all as read</button></div><div className="mt-6 overflow-hidden rounded-2xl border border-stone-200 bg-white">{items.length === 0 ? <p className="p-8 text-center text-sm text-stone-500">No notifications yet.</p> : items.map((item) => <Link key={item._id} href={item.href || '#'} onClick={() => { if (!item.readAt) void fetch(`/api/notifications/${item._id}`, { method: 'PATCH' }); }} className={`block border-b border-stone-100 p-4 last:border-0 hover:bg-amber-50 ${item.readAt ? '' : 'bg-amber-50/60'}`}><div className="flex gap-3"><span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.readAt ? 'bg-stone-200' : 'bg-amber-600'}`} /><div><h2 className="font-semibold text-stone-900">{item.title}</h2><p className="mt-1 text-sm text-stone-600">{item.message}</p><time className="mt-2 block text-xs text-stone-400">{new Date(item.createdAt).toLocaleString()}</time></div></div></Link>)}</div></section>;
}
