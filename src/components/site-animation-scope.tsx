'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { normalizeSiteAnimations, type SiteAnimations } from '@/src/types/site-animations';
import BootLoadingAnimation from '@/src/components/boot-loading-animation';

const excludedPaths = [
  '/admin',
  '/cart',
  '/checkout',
  '/account/change-password',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/kitchen',
  '/delivery',
  '/manager',
];

export function SiteAnimationScope({
  animations: value,
  restaurantName,
  restaurantLogo,
  children,
}: {
  animations?: Partial<SiteAnimations> | null;
  restaurantName?: string | null;
  restaurantLogo?: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const animations = normalizeSiteAnimations(value);
  const excluded = excludedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
    || /^\/account\/bookings\/[^/]+\/pay(?:\/|$)/.test(pathname);
  const enabled = animations.enabled && !excluded;
  const [initialBootPending, setInitialBootPending] = useState(enabled && animations.bootLoader);
  const scopeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initialBootPending) return;
    const scope = scopeRef.current;
    if (!scope) return;

    let sawBootOverlay = Boolean(scope.querySelector('.boot-loading-overlay'));
    let clearFallback = () => {};
    const observer = new MutationObserver(() => {
      if (scope.querySelector('.boot-loading-overlay')) {
        sawBootOverlay = true;
        return;
      }
      if (sawBootOverlay) {
        clearFallback();
        observer.disconnect();
        setInitialBootPending(false);
      }
    });
    observer.observe(scope, { childList: true, subtree: true });
    const fallback = window.setTimeout(() => {
      observer.disconnect();
      setInitialBootPending(false);
    }, 15_500);
    clearFallback = () => window.clearTimeout(fallback);

    return () => {
      clearFallback();
      observer.disconnect();
    };
  }, [initialBootPending]);

  return (
    <div
      ref={scopeRef}
      className="site-animation-scope"
      data-site-animation-brand={enabled && animations.brandFloat ? 'true' : undefined}
      data-site-animation-content={enabled && animations.contentGlow ? 'true' : undefined}
      data-site-animation-actions={enabled && animations.actionPulse ? 'true' : undefined}
      data-site-animation-loader={enabled && animations.foodLoader ? 'true' : undefined}
      data-food-loader-random={animations.foodLoaderRandom ? 'true' : 'false'}
      data-food-loader-scene={animations.foodLoaderScene}
      data-site-initial-boot-pending={initialBootPending ? 'true' : undefined}
      data-site-animation-boot-loader={enabled && animations.bootLoader ? 'true' : undefined}
      data-boot-loader-random={animations.bootLoaderRandom ? 'true' : 'false'}
      data-boot-loader-style={animations.bootLoaderStyle}
    >
      <BootLoadingAnimation
        enabled={enabled && animations.bootLoader}
        initiallyEnabled={enabled && animations.bootLoader}
        random={animations.bootLoaderRandom}
        selectedStyle={animations.bootLoaderStyle}
        restaurantName={restaurantName}
        logo={restaurantLogo}
      />
      {children}
    </div>
  );
}
