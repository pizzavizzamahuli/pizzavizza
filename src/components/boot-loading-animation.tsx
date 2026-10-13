'use client';

import { useEffect, useState } from 'react';
import { chooseBootLoaderStyle, type BootLoaderStyle } from '@/src/utils/boot-loader';

function waitForWindowLoad(signal: AbortSignal) {
  if (document.readyState === 'complete' || signal.aborted) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const finish = () => {
      window.removeEventListener('load', finish);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    window.addEventListener('load', finish, { once: true });
    signal.addEventListener('abort', finish, { once: true });
  });
}

function nextFrame() {
  return new Promise<void>((resolve) => window.requestAnimationFrame(() => resolve()));
}

function waitForImage(image: HTMLImageElement, signal: AbortSignal) {
  if (signal.aborted || (image.complete && (image.currentSrc || (!image.src && !image.srcset)))) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const finish = () => {
      image.removeEventListener('load', finish);
      image.removeEventListener('error', finish);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    image.addEventListener('load', finish, { once: true });
    image.addEventListener('error', finish, { once: true });
    signal.addEventListener('abort', finish, { once: true });
  });
}

function isRelevantImage(image: HTMLImageElement) {
  if (image.loading !== 'lazy' || image.currentSrc) return true;
  const bounds = image.getBoundingClientRect();
  const nearViewport = bounds.top < window.innerHeight * 1.5 && bounds.bottom > -window.innerHeight * 0.5;
  if (nearViewport) image.loading = 'eager';
  return nearViewport;
}

function waitForPendingPlacements(signal: AbortSignal) {
  if (signal.aborted || !document.querySelector('[data-site-boot-pending="true"]')) return Promise.resolve();
  return new Promise<void>((resolve) => {
    const finish = () => {
      observer.disconnect();
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const observer = new MutationObserver(() => {
      if (document.querySelector('[data-site-boot-pending="true"]')) return;
      finish();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
    signal.addEventListener('abort', finish, { once: true });
    if (!document.querySelector('[data-site-boot-pending="true"]')) {
      finish();
    }
  });
}

async function waitForPageResources(signal: AbortSignal) {
  await waitForWindowLoad(signal);
  await document.fonts?.ready.catch(() => undefined);
  await nextFrame();

  while (!signal.aborted) {
    await waitForPendingPlacements(signal);
    if (signal.aborted) return;
    const images = Array.from(document.images).filter(isRelevantImage);
    await Promise.all(images.map((image) => waitForImage(image, signal)));
    if (signal.aborted) return;
    await Promise.all(images.filter((image) => image.naturalWidth > 0).map((image) => image.decode().catch(() => undefined)));
    await nextFrame();
    await nextFrame();

    const hasPendingImage = Array.from(document.images)
      .filter(isRelevantImage)
      .some((image) => !image.complete);
    if (!hasPendingImage && !document.querySelector('[data-site-boot-pending="true"]')) return;
  }
}

export default function BootLoadingAnimation({
  enabled,
  initiallyEnabled,
  random,
  selectedStyle,
}: {
  enabled: boolean;
  initiallyEnabled: boolean;
  random: boolean;
  selectedStyle: BootLoaderStyle;
}) {
  const [shouldRun] = useState(initiallyEnabled);
  const [visible, setVisible] = useState(initiallyEnabled);
  const [style, setStyle] = useState(selectedStyle);

  useEffect(() => {
    if (!shouldRun) return;
    const selectionFrame = window.requestAnimationFrame(() => {
      setStyle(random ? chooseBootLoaderStyle() : selectedStyle);
    });
    const controller = new AbortController();
    let active = true;
    const fallback = window.setTimeout(() => {
      controller.abort();
      setVisible(false);
    }, 15_000);
    void waitForPageResources(controller.signal).then(() => {
      if (active) {
        window.clearTimeout(fallback);
        setVisible(false);
      }
    }).catch(() => {
      if (active) setVisible(false);
    });
    return () => {
      active = false;
      window.clearTimeout(fallback);
      controller.abort();
      if (selectionFrame !== undefined) window.cancelAnimationFrame(selectionFrame);
    };
  }, [random, selectedStyle, shouldRun]);

  if (!enabled || !visible) return null;

  return (
    <div className="boot-loading-overlay" role="status" aria-live="polite" aria-label="Loading Pizza Vizza">
      <div className="boot-loading-content">
        <div className={`boot-loader-visual boot-loader-${style}`} aria-hidden="true">
          <span className="boot-loader-orbit"><i /><i /><i /></span>
          <span className="boot-loader-ring" />
          <span className="boot-loader-sweep" />
          <span className="boot-loader-core">PV</span>
          <span className="boot-loader-bars"><i /><i /><i /><i /><i /></span>
          <span className="boot-loader-dots"><i /><i /><i /></span>
          <span className="boot-loader-diamond" />
        </div>
        <p className="boot-loading-brand">PIZZA VIZZA</p>
        <p className="boot-loading-message">Preparing your experience</p>
        <span className="boot-loading-caption">Fresh food. Warm welcome.</span>
      </div>
    </div>
  );
}
