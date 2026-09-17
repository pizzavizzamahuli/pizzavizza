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
  const [position, setPosition] = useState<Position | null>(null);
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const positionRef = useRef<Position | null>(position);
  const dragRef = useRef({ active: false, pointerId: -1, moved: false, frame: 0, offset: { x: 0, y: 0 }, next: { x: 0, y: 0 } });
  const copy = useMemo(() => getRoleCopy(user, restaurantName), [restaurantName, user]);

  useEffect(() => {
    let timeout = 0;
    try {
      const saved = window.localStorage.getItem(positionStorageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Partial<Position>;
      if (typeof parsed.x !== 'number' || typeof parsed.y !== 'number') return;
      const next = { x: parsed.x, y: parsed.y };
      timeout = window.setTimeout(() => {
        setPosition(next);
        positionRef.current = next;
      }, 0);
    } catch {
      // Ignore storage restrictions or invalid saved positions.
    }
    return () => { if (timeout) window.clearTimeout(timeout); };
  }, []);

  if (!enabled) return null;

  function applyPosition(next: Position) {
    positionRef.current = next;
    if (!rootRef.current) return;
    rootRef.current.style.left = `${next.x}px`;
    rootRef.current.style.top = `${next.y}px`;
    rootRef.current.style.right = 'auto';
    rootRef.current.style.bottom = 'auto';
  }

  function startDrag(event: React.PointerEvent<HTMLElement>) {
    const box = rootRef.current?.getBoundingClientRect();
    if (!box) return;
    event.preventDefault();
    dragRef.current = { active: true, pointerId: event.pointerId, moved: false, frame: 0, offset: { x: event.clientX - box.left, y: event.clientY - box.top }, next: { x: box.left, y: box.top } };
    positionRef.current = { x: box.left, y: box.top };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDragging(true);
  }

  function moveDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    event.preventDefault();
    const distance = Math.abs(event.clientX - (drag.next.x + drag.offset.x)) + Math.abs(event.clientY - (drag.next.y + drag.offset.y));
    if (distance > 4) drag.moved = true;
    const width = rootRef.current?.offsetWidth || 56;
    const height = rootRef.current?.offsetHeight || 56;
    drag.next = { x: Math.max(8, Math.min(window.innerWidth - width - 8, event.clientX - drag.offset.x)), y: Math.max(8, Math.min(window.innerHeight - height - 8, event.clientY - drag.offset.y)) };
    if (!drag.frame) drag.frame = requestAnimationFrame(() => { drag.frame = 0; applyPosition(drag.next); });
  }

  function finishDrag(event: React.PointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag.active || drag.pointerId !== event.pointerId) return;
    if (drag.frame) cancelAnimationFrame(drag.frame);
    applyPosition(drag.next);
    setPosition(drag.next);
    try { window.localStorage.setItem(positionStorageKey, JSON.stringify(drag.next)); } catch { /* Ignore storage restrictions. */ }
    drag.active = false;
    setDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }

  function toggleFromButton() {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      return;
    }
    setOpen((value) => !value);
  }

  return (
    <div ref={rootRef} className={`fixed z-[70] flex flex-col items-end gap-2 ${dragging ? 'cursor-grabbing select-none' : ''}`} style={position ? { left: position.x, top: position.y, right: 'auto', bottom: 'auto' } : { bottom: '1.25rem', right: '1.25rem' }}>
      {open ? <section className="w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-3xl border border-amber-200 bg-white shadow-2xl ring-1 ring-black/5" aria-label={copy.title}>
        <header className="flex cursor-grab touch-none items-center justify-between gap-3 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-3 text-white" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag}>
          <div className="flex min-w-0 items-center gap-2"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-300 shadow-[0_0_0_4px_rgb(255_255_255_/_0.18)]" /><span className="truncate text-sm font-bold">{copy.title}</span></div>
          <button type="button" aria-label="Close chatbot" onPointerDown={(event) => event.stopPropagation()} onClick={() => setOpen(false)} className="rounded-full bg-white/20 px-2.5 py-1 text-lg leading-none transition hover:bg-white/30">×</button>
        </header>
        <div className="space-y-3 p-4 text-sm text-stone-600"><p className="rounded-2xl bg-amber-50 px-3.5 py-3 leading-5 text-stone-700">{copy.greeting}</p><div className="grid gap-2 sm:grid-cols-2">{copy.actions.map((action: Action) => <Link key={action.href} href={action.href} onClick={() => setOpen(false)} className="rounded-xl border border-stone-200 bg-stone-50 px-3 py-2.5 text-center text-xs font-semibold text-stone-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700">{action.label}</Link>)}</div><p className="text-center text-[11px] text-stone-400">Header ko drag karke assistant ko move karein.</p></div>
      </section> : null}
      <button type="button" aria-label={open ? 'Close chatbot' : 'Open chatbot'} aria-expanded={open} title={open ? 'Close Pizza Vizza assistant' : 'Open Pizza Vizza assistant'} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onClick={toggleFromButton} className="flex h-14 w-14 touch-none items-center justify-center rounded-full bg-amber-600 text-2xl shadow-xl ring-4 ring-amber-100 transition hover:scale-105 hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-300" >{open ? '×' : '🍕'}</button>
    </div>
  );
}
