'use client';

import { useEffect } from 'react';

export function ImageDownloadProtection() {
  useEffect(() => {
    const blockImageActions = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const isImageElement = target instanceof HTMLElement && (target.closest('img') || target.closest('picture') || target.closest('svg'));

      if (!isImageElement) return;
      event.preventDefault();
    };

    const handleDragStart = (event: DragEvent) => {
      const target = event.target as HTMLElement | null;
      const isImageElement = target instanceof HTMLElement && (target.closest('img') || target.closest('picture') || target.closest('svg'));

      if (isImageElement) {
        event.preventDefault();
      }
    };

    document.addEventListener('contextmenu', blockImageActions, { passive: false });
    document.addEventListener('dragstart', handleDragStart, { passive: false });

    return () => {
      document.removeEventListener('contextmenu', blockImageActions);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, []);

  return null;
}
