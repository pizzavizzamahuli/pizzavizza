'use client';

import { useEffect, useRef } from 'react';
import type { AdPlacement, AdsterraUnitKey } from '@/src/types/advertisements';

type AdsterraUnitConfig = {
  type: 'native' | 'script' | 'link' | 'iframe-script';
  scriptUrl?: string;
  containerId?: string;
  href?: string;
  atOptions?: Record<string, string | number | Record<string, never>>;
};

const ADSTERRA_UNIT_CONFIG: Record<AdsterraUnitKey, AdsterraUnitConfig> = {
  nativeBanner: {
    type: 'native',
    scriptUrl: 'https://bauval.org/21/57150d062c776ec897f87255e25a9c98',
    containerId: 'container-57150d062c776ec897f87255e25a9c98',
  },
  popunder: {
    type: 'script',
    scriptUrl: 'https://abscloud.org/1/6915afb65d48fd7be97e82f62c1af2f2',
  },
  smartlink: {
    type: 'link',
    href: 'https://araplhn.org/4/d159107c3a2c54e6129cb7dde52f2129',
  },
  socialBar: {
    type: 'script',
    scriptUrl: 'https://bauval.org/14/d0a38da150f96a83027a45247b1b33f4',
  },
  'banner300x250': {
    type: 'iframe-script',
    scriptUrl: 'https://bauval.org/22/1a770a7d649081ac692c223cd729120a',
    atOptions: {
      key: '1a770a7d649081ac692c223cd729120a',
      format: 'iframe',
      height: 250,
      width: 300,
      params: {},
    },
  },
  'banner160x300': {
    type: 'iframe-script',
    scriptUrl: 'https://bauval.org/22/d6535ba373cb263dc91aed1e5ca7ebe8',
    atOptions: {
      key: 'd6535ba373cb263dc91aed1e5ca7ebe8',
      format: 'iframe',
      height: 300,
      width: 160,
      params: {},
    },
  },
  'banner468x60': {
    type: 'iframe-script',
    scriptUrl: 'https://bauval.org/22/e85ce3a408f2b6b470d5837e420d0c02',
    atOptions: {
      key: 'e85ce3a408f2b6b470d5837e420d0c02',
      format: 'iframe',
      height: 60,
      width: 468,
      params: {},
    },
  },
  'banner160x600': {
    type: 'iframe-script',
    scriptUrl: 'https://bauval.org/22/ba4259576174ba5f5635b7137a9e34f9',
    atOptions: {
      key: 'ba4259576174ba5f5635b7137a9e34f9',
      format: 'iframe',
      height: 600,
      width: 160,
      params: {},
    },
  },
  'banner320x50': {
    type: 'iframe-script',
    scriptUrl: 'https://bauval.org/22/7dd312cbfe7002747fd92ea58a015dc9',
    atOptions: {
      key: '7dd312cbfe7002747fd92ea58a015dc9',
      format: 'iframe',
      height: 50,
      width: 320,
      params: {},
    },
  },
  'banner728x90': {
    type: 'iframe-script',
    scriptUrl: 'https://bauval.org/22/b38738b2c108ccfc1985016cb89494ec',
    atOptions: {
      key: 'b38738b2c108ccfc1985016cb89494ec',
      format: 'iframe',
      height: 90,
      width: 728,
      params: {},
    },
  },
};

const BLOCKED_ROUTE_PREFIXES = [
  '/checkout',
  '/cart',
  '/account',
  '/admin',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/manager',
  '/kitchen',
  '/api',
];

export function isAdsterraRouteAllowed(pathname: string) {
  const nextPath = pathname.toLowerCase();
  if (!nextPath || BLOCKED_ROUTE_PREFIXES.some((prefix) => nextPath === prefix || nextPath.startsWith(prefix + '/'))) {
    return false;
  }
  return nextPath === '/' || nextPath.startsWith('/menu') || nextPath.startsWith('/dining') || nextPath === '/delivery';
}

function injectScript(unitKey: AdsterraUnitKey, detail: AdsterraUnitConfig) {
  if (typeof window === 'undefined') return;
  const uniqueScriptSelector = `script[data-adsterra-unit="${unitKey}"]`;
  if (document.querySelector(uniqueScriptSelector)) {
    return;
  }

  if (detail.type === 'iframe-script' && detail.atOptions) {
    const setupScript = document.createElement('script');
    const globalAtOptionsKey = `__pizzavizza_adsterra_atOptions_${unitKey}`;
    setupScript.type = 'text/javascript';
    setupScript.dataset.adsterraUnit = unitKey;
    setupScript.textContent = `window["${globalAtOptionsKey}"] = ${JSON.stringify(detail.atOptions)};`;
    document.head.appendChild(setupScript);
  }

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.async = true;
  script.dataset.adsterraUnit = unitKey;
  if (detail.type === 'script' || detail.type === 'iframe-script') {
    script.src = detail.scriptUrl!;
    script.setAttribute('data-cfasync', 'false');
  }
  if (detail.type === 'native') {
    script.setAttribute('data-cfasync', 'false');
    script.src = detail.scriptUrl!;
  }
  document.head.appendChild(script);
}

export function AdsterraUnitRenderer({ unitKey, placement }: { unitKey: AdsterraUnitKey; placement: AdPlacement }) {
  const didLoadRef = useRef(false);
  const detail = ADSTERRA_UNIT_CONFIG[unitKey];

  useEffect(() => {
    if (didLoadRef.current || typeof window === 'undefined') return;
    didLoadRef.current = true;
    if (!isAdsterraRouteAllowed(window.location.pathname)) return;
    if (detail.type === 'link') return;
    injectScript(unitKey, detail);
  }, [detail, placement, unitKey]);

  if (detail.type === 'native') {
    return <div id={detail.containerId ?? `container-${unitKey}`} aria-label="Sponsored advertisement" className="min-h-[120px] w-full" />;
  }

  if (detail.type === 'link') {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-700">Sponsored link</div>
        <a href={detail.href} target="_blank" rel="sponsored nofollow noopener noreferrer" className="font-medium underline underline-offset-4">
          Open sponsored offer
        </a>
      </div>
    );
  }

  const iframeStyle = { width: '100%', maxWidth: '100%', height: 'auto', minHeight: Number(detail.atOptions?.height ?? 90) };
  return <div aria-label="Sponsored advertisement" className="w-full overflow-hidden rounded-xl border border-stone-200 bg-white p-2 text-center" style={iframeStyle} />;
}
