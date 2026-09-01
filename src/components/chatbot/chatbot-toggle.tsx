'use client';

import { useEffect, useState } from 'react';

const quickReplies = ['Menu', 'Orders', 'Dining', 'Support'];

export function ChatbotToggle() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const res = await fetch('/api/admin/settings/restaurant');
        const data = await res.json();
        if (!isMounted) return;
        setEnabled(data?.data?.chatbotEnabled ?? true);
      } catch {
        if (isMounted) setEnabled(true);
      }
    };

    void loadSettings();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!enabled) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">
      {open ? (
        <div className="w-72 overflow-hidden rounded-2xl border border-amber-200 bg-white shadow-xl ring-1 ring-stone-200">
          <div className="flex items-center justify-between border-b border-stone-200 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2.5 text-white">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
              <span className="text-sm font-semibold">Pizza Vizza Assistant</span>
            </div>
            <button
              type="button"
              aria-label="Hide chatbot"
              onClick={() => setOpen(false)}
              className="rounded-full bg-white/20 px-2 py-1 text-xs font-medium transition hover:bg-white/30"
            >
              Hide
            </button>
          </div>

          <div className="space-y-3 p-3 text-sm text-stone-600">
            <p className="rounded-xl bg-stone-100 px-3 py-2 text-stone-700">
              Hi! I can help with menu, orders, dining reservations, and account support.
            </p>

            <div className="flex flex-wrap gap-2">
              {quickReplies.map((item) => (
                <button
                  key={item}
                  type="button"
                  className="rounded-full border border-stone-200 bg-stone-50 px-2.5 py-1.5 text-xs font-medium text-stone-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        aria-label={open ? 'Hide chatbot' : 'Show chatbot'}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-600 text-sm font-semibold text-white shadow-lg transition hover:bg-amber-700 focus:outline-none focus:ring-4 focus:ring-amber-200"
      >
        {open ? '×' : 'Chat'}
      </button>
    </div>
  );
}
