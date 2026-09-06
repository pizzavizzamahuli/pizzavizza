'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';

type ChatbotUser = { name?: string | null; role?: string | null };
type ChatbotToggleProps = { enabled: boolean; user: ChatbotUser | null; restaurantName: string };
type Position = { x: number; y: number };
type Action = { label: string; href: string };

const positionStorageKey = 'pizza-vizza-chatbot-position';

function getRoleCopy(user: ChatbotUser | null, restaurantName: string) {
  if (!user) return { title: `${restaurantName} Assistant`, greeting: 'Namaste! Menu, ordering, dining aur support mein main aapki help kar sakta hoon.', actions: [{ label: 'Menu dekhein', href: '/menu' }, { label: 'Dining book karein', href: '/dining' }, { label: 'Login karein', href: '/login' }] };
  if (user.role === 'MAIN_ADMIN' || user.role === 'ADMIN') return { title: 'Admin Assistant', greeting: `Namaste ${user.name || 'Admin'}! Store operations ke liye quick access yahan hai.`, actions: [{ label: 'Admin dashboard', href: '/admin' }, { label: 'Orders manage karein', href: '/admin/orders' }, { label: 'Notifications', href: '/admin/notifications' }, { label: 'Settings', href: '/admin/settings' }] };
  if (user.role === 'MANAGER') return { title: 'Manager Assistant', greeting: `Namaste ${user.name || 'Manager'}! Operations aur bookings ke shortcuts yahan milenge.`, actions: [{ label: 'Operations', href: '/manager' }, { label: 'Orders', href: '/admin/orders' }, { label: 'Bookings', href: '/admin/bookings' }] };
  if (user.role === 'KITCHEN_STAFF') return { title: 'Kitchen Assistant', greeting: `Namaste ${user.name || 'Team'}! Kitchen workflow ke liye yahan se ja sakte hain.`, actions: [{ label: 'Kitchen kholen', href: '/kitchen' }, { label: 'Account', href: '/account' }] };
  if (user.role === 'DELIVERY_STAFF') return { title: 'Delivery Assistant', greeting: `Namaste ${user.name || 'Team'}! Assigned deliveries aur account yahan se dekhein.`, actions: [{ label: 'Delivery dashboard', href: '/delivery' }, { label: 'Account', href: '/account' }] };
  return { title: `${restaurantName} Assistant`, greeting: `Namaste ${user.name || 'Customer'}! Aapke order aur dining mein main help kar sakta hoon.`, actions: [{ label: 'Menu dekhein', href: '/menu' }, { label: 'Mere orders', href: '/account/orders' }, { label: 'Account', href: '/account' }, { label: 'Dining book karein', href: '/dining' }] };
}

export function ChatbotToggle({ enabled, user, restaurantName }: ChatbotToggleProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const saved = window.localStorage.getItem(positionStorageKey);
      return saved ? JSON.parse(saved) as Position : null;
    } catch {
      return null;
    }
  });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });
  const copy = useMemo(() => getRoleCopy(user, restaurantName), [restaurantName, user]);

  useEffect(() => {
    if (!dragging) return;
    function move(event: PointerEvent) { setPosition({ x: Math.max(8, Math.min(window.innerWidth - 64, event.clientX - dragOffset.current.x)), y: Math.max(8, Math.min(window.innerHeight - 64, event.clientY - dragOffset.current.y)) }); }
    function stop() { setDragging(false); }
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    return () => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', stop); };
  }, [dragging]);

  if (!enabled) return null;

  function startDrag(event: React.PointerEvent) {
    const box = event.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
    if (!box) return;
    event.preventDefault();
    dragOffset.current = { x: event.clientX - box.left, y: event.clientY - box.top };
    setPosition({ x: box.left, y: box.top });
    setDragging(true);
  }

  function savePosition() { if (position) try { window.localStorage.setItem(positionStorageKey, JSON.stringify(position)); } catch { /* Ignore storage restrictions. */ } }

  return (
    <div className="fixed z-[70] flex flex-col items-end gap-2" style={position ? { left: position.x, top: position.y } : { bottom: '1.25rem', right: '1.25rem' }} onPointerUp={savePosition}>
      {open ? <section className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl ring-1 ring-black/5" aria-label={copy.title}>
        <header className="flex cursor-move items-center justify-between gap-3 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-white" onPointerDown={startDrag}>
          <div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgb(255_255_255_/_0.18)]" /><span className="truncate text-sm font-bold">{copy.title}</span></div>
          <button type="button" aria-label="Close chatbot" onClick={() => setOpen(false)} className="rounded-full bg-white/20 px-2.5 py-1 text-lg leading-none transition hover:bg-white/30">×</button>
        </header>
        <div className="space-y-3 p-4 text-sm text-stone-600"><p className="rounded-2xl bg-amber-50 px-3.5 py-3 leading-5 text-stone-700">{copy.greeting}</p><div className="grid gap-2 sm:grid-cols-2">{copy.actions.map((action: Action) => <Link key={action.href} href={action.href} onClick={() => setOpen(false)} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-center text-xs font-semibold text-stone-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700">{action.label}</Link>)}</div><p className="text-center text-[11px] text-stone-400">Header ko drag karke assistant ko move karein.</p></div>
      </section> : null}
      <button type="button" aria-label={open ? 'Close chatbot' : 'Open chatbot'} aria-expanded={open} title={open ? 'Close Pizza Vizza assistant' : 'Open Pizza Vizza assistant'} onClick={() => setOpen((value) => !value)} className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-600 text-2xl shadow-xl ring-4 ring-amber-100 transition hover:scale-105 hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-300" >{open ? '×' : '🍕'}</button>
    </div>
  );
}
