'use client';

import { useEffect, useRef, useState } from 'react';

interface Position {
  left: number;
  top: number;
}

export function PWAShell() {
  const [mounted, setMounted] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [offline, setOffline] = useState(false);
  const [position, setPosition] = useState<Position>({ left: 16, top: 16 });
  const [positionLoaded, setPositionLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    const nav = window.navigator as unknown as { standalone?: boolean };
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');

    const checkStandalone = () => {
      setIsStandalone(displayModeQuery.matches || nav.standalone === true);
    };

    const beforeInstallPromptHandler = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const appInstalledHandler = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
    };

    const onlineHandler = () => setOffline(false);
    const offlineHandler = () => setOffline(true);

    const handleMove = (event: PointerEvent) => {
      if (!dragging) return;
      event.preventDefault();
      const nextLeft = Math.min(
        Math.max(16, event.clientX - dragOffset.current.x),
        window.innerWidth - 320 - 16,
      );
      const nextTop = Math.min(
        Math.max(16, event.clientY - dragOffset.current.y),
        window.innerHeight - 160 - 16,
      );
      setPosition({ left: nextLeft, top: nextTop });
    };

    const handleUp = () => {
      setDragging(false);
    };

    const initialize = () => {
      try {
        const saved = window.localStorage.getItem('pwaShellPosition');
        if (saved) {
          const parsed = JSON.parse(saved) as Position;
          if (typeof parsed.left === 'number' && typeof parsed.top === 'number') {
            setPosition(parsed);
          }
        }
      } catch {
        // ignore invalid storage values
      }

      setOffline(!window.navigator.onLine);
      checkStandalone();
      setPositionLoaded(true);
    };

    initialize();

    if ('addEventListener' in displayModeQuery) {
      displayModeQuery.addEventListener('change', checkStandalone);
    } else {
      // @ts-expect-error legacy browsers use addListener
      displayModeQuery.addListener(checkStandalone);
    }

    window.addEventListener('beforeinstallprompt', beforeInstallPromptHandler);
    window.addEventListener('appinstalled', appInstalledHandler);
    window.addEventListener('online', onlineHandler);
    window.addEventListener('offline', offlineHandler);
    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);

    return () => {
      if ('removeEventListener' in displayModeQuery) {
        displayModeQuery.removeEventListener('change', checkStandalone);
      } else {
        // @ts-expect-error legacy browsers use removeListener
        displayModeQuery.removeListener(checkStandalone);
      }
      window.removeEventListener('beforeinstallprompt', beforeInstallPromptHandler);
      window.removeEventListener('appinstalled', appInstalledHandler);
      window.removeEventListener('online', onlineHandler);
      window.removeEventListener('offline', offlineHandler);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };
  }, [dragging, mounted]);

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') return;

    try {
      window.localStorage.setItem('pwaShellPosition', JSON.stringify(position));
    } catch {
      // ignore write errors
    }
  }, [mounted, position]);

  if (!mounted) {
    return null;
  }

  const showInstall = Boolean(deferredPrompt && !isStandalone);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();

    try {
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    } catch {
      setDeferredPrompt(null);
    }
  };

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;

    dragOffset.current = {
      x: event.clientX - position.left,
      y: event.clientY - position.top,
    };

    setDragging(true);
  };

  const containerClassName = 'fixed z-50 space-y-2 text-sm text-stone-700';
  const containerStyle = positionLoaded
    ? { left: position.left, top: position.top, width: 320 }
    : { right: 16, bottom: 16, width: 320 };

  return (
    <div className={containerClassName} style={containerStyle}>
      <div>
        {offline ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-sm">
            Offline • reconnect to continue.
          </div>
        ) : null}

        {showInstall ? (
          <div
            className="cursor-move rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 shadow-sm"
            onPointerDown={startDrag}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-stone-900">Install Pizza Vizza</p>
                <p className="text-sm text-stone-700">Add Pizza Vizza to your device for an app-like experience.</p>
              </div>
              <button
                onClick={handleInstall}
                className="rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
              >
                Install
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

declare global {
  interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  }
}
