'use client';

import { useEffect } from 'react';

export function ServiceWorkerCleanup() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        void registration.unregister();
      }
    }).catch(() => {
      // ignore cleanup failures
    });

    if ('caches' in window) {
      void caches.keys().then((keys) => {
        return Promise.all(keys.map((key) => caches.delete(key)));
      }).catch(() => {
        // ignore cache cleanup failures
      });
    }
  }, []);

  return null;
}
