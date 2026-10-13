'use client';

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdPlacement } from '@/src/types/advertisements';

interface LocalCampaign {
  _id: string;
  businessName: string;
  imageUrl: string;
  destinationUrl: string;
  placement: AdPlacement;
}

interface AdSenseConfig {
  publisherId: string;
  autoAds: boolean;
  slot: string | null;
}

interface PlacementData {
  localAdsEnabled: boolean;
  campaigns: LocalCampaign[];
  adsense: AdSenseConfig | null;
}

interface TcfData {
  eventStatus?: string;
  listenerId?: number;
  purpose?: { consents?: Record<number, boolean> };
  vendor?: { consents?: Record<number, boolean> };
}

declare global {
  interface Window {
    __tcfapi?: (
      command: 'addEventListener' | 'removeEventListener',
      version: 2,
      callback: (data: TcfData, success: boolean) => void,
      listenerId?: number,
    ) => void;
    adsbygoogle?: Array<Record<string, never>>;
  }
}

async function parseResponse(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error('Advertisement settings could not be read.');
  }
}

function loadAdSenseScript(publisherId: string) {
  const scriptId = 'pizzavizza-adsense-script';
  const currentScript = document.getElementById(scriptId) as HTMLScriptElement | null;
  if (currentScript) return currentScript.dataset.publisherId === publisherId ? currentScript : null;
  const script = document.createElement('script');
  script.id = scriptId;
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.dataset.publisherId = publisherId;
  script.addEventListener('load', () => { script.dataset.adsenseLoaded = 'true'; }, { once: true });
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
  document.head.appendChild(script);
  return script;
}

function AdSensePlacement({ config }: { config: AdSenseConfig }) {
  const [consented, setConsented] = useState(false);
  const adRef = useRef<HTMLModElement>(null);

  useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    let listenerId: number | undefined;
    const checkCmp = () => {
      if (!window.__tcfapi) return false;
      window.__tcfapi('addEventListener', 2, (data, success) => {
        if (cancelled || !success) return;
        if (data.listenerId !== undefined) listenerId = data.listenerId;
        const consentStateReady = data.eventStatus === 'tcloaded' || data.eventStatus === 'useractioncomplete';
        if (consentStateReady && data.purpose?.consents?.[1] === true && data.vendor?.consents?.[755] === true) setConsented(true);
        else setConsented(false);
      });
      return true;
    };
    if (!checkCmp()) {
      let attempts = 0;
      interval = setInterval(() => {
        attempts += 1;
        if ((checkCmp() || attempts >= 60) && interval) clearInterval(interval);
      }, 500);
    }
    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      if (listenerId !== undefined) window.__tcfapi?.('removeEventListener', 2, () => {}, listenerId);
    };
  }, []);

  useEffect(() => {
    if (!consented) return;
    const script = loadAdSenseScript(config.publisherId);
    if (!script || config.autoAds || !config.slot) return;
    const element = adRef.current;
    if (!element || element.dataset.adsenseRequested) return;
    const requestAd = () => {
      if (element.dataset.adsenseRequested) return;
      element.dataset.adsenseRequested = 'true';
      window.adsbygoogle = window.adsbygoogle || [];
      window.adsbygoogle.push({});
    };
    if (script.dataset.adsenseLoaded === 'true') {
      requestAd();
      return;
    }
    script.addEventListener('load', requestAd, { once: true });
    return () => script.removeEventListener('load', requestAd);
  }, [consented, config.autoAds, config.publisherId, config.slot]);

  if (!consented || config.autoAds || !config.slot) return null;
  return (
    <div className="min-h-[250px] rounded-xl border border-stone-100 bg-white p-2">
      <ins
        ref={adRef}
        className="adsbygoogle block min-h-[250px] w-full overflow-hidden"
        style={{ display: 'block', minHeight: 250 }}
        data-ad-client={config.publisherId}
        data-ad-slot={config.slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
        aria-label="Advertisement"
      />
    </div>
  );
}

export default function AdPlacement({ placement }: { placement: AdPlacement }) {
  const [data, setData] = useState<PlacementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/advertisements?placement=${placement}`, { cache: 'no-store' });
      const result = await parseResponse(response);
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load advertisements.');
      const nextData = result.data as PlacementData;
      setData(nextData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load advertisements.');
    } finally {
      setLoading(false);
    }
  }, [placement]);

  useEffect(() => {
    const timeout = setTimeout(() => { void refresh(); }, 0);
    return () => clearTimeout(timeout);
  }, [refresh]);

  if (loading) return null;
  if (!data || (!data.localAdsEnabled && !data.adsense)) return error ? <p role="status" className="my-3 text-xs text-stone-500">{error}</p> : null;

  return (
    <section aria-label="Sponsored advertisements" className="my-5 space-y-3">
      {data.localAdsEnabled
        ? data.campaigns.map((campaign) => (
          <article key={campaign._id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <a
              href={campaign.destinationUrl}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              className="block focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-600"
            >
              <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)]">
                <div className="p-4 sm:p-5">
                  <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-stone-600">Sponsored</span>
                  <h2 className="mt-3 text-lg font-semibold text-stone-900">{campaign.businessName}</h2>
                  <p className="mt-1 text-sm text-amber-800">Visit advertiser</p>
                </div>
                <img src={campaign.imageUrl} alt={`${campaign.businessName} sponsored advertisement`} loading="lazy" className="aspect-[16/7] h-full min-h-36 w-full bg-stone-100 object-cover sm:aspect-auto" />
              </div>
            </a>
          </article>
        ))
        : null}
      {data.adsense ? <AdSensePlacement config={data.adsense} /> : null}
      {error ? <p role="status" className="text-xs text-stone-500">{error}</p> : null}
    </section>
  );
}
