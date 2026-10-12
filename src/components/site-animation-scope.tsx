'use client';

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { normalizeSiteAnimations, type SiteAnimations } from '@/src/types/site-animations';

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

export function SiteAnimationScope({ animations: value, children }: { animations?: Partial<SiteAnimations> | null; children: ReactNode }) {
  const pathname = usePathname();
  const animations = normalizeSiteAnimations(value);
  const excluded = excludedPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))
    || /^\/account\/bookings\/[^/]+\/pay(?:\/|$)/.test(pathname);
  const enabled = animations.enabled && !excluded;

  return (
    <div
      className="site-animation-scope"
      data-site-animation-brand={enabled && animations.brandFloat ? 'true' : undefined}
      data-site-animation-content={enabled && animations.contentGlow ? 'true' : undefined}
      data-site-animation-actions={enabled && animations.actionPulse ? 'true' : undefined}
    >
      {children}
    </div>
  );
}
