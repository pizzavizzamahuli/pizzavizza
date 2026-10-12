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
  localAdsConsent: boolean;
  localAdsChoice: 'accepted' | 'rejected' | null;
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

function getSessionId() {
  const key = 'pv-local-ad-session:v1';
  let sessionId = sessionStorage.getItem(key);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    sessionStorage.setItem(key, sessionId);
  }
  return sessionId;
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
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [preferenceOpen, setPreferenceOpen] = useState(false);
  const [savingChoice, setSavingChoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reported = useRef(new Set<string>());
  const placementRef = useRef<HTMLElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/advertisements?placement=${placement}`, { cache: 'no-store' });
      const result = await parseResponse(response);
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to load advertisements.');
      const nextData = result.data as PlacementData;
      setData(nextData);
      setSessionId(nextData.localAdsEnabled && nextData.localAdsConsent ? getSessionId() : null);
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

  async function chooseConsent(choice: 'accepted' | 'rejected') {
    setSavingChoice(true);
    setError(null);
    try {
      const response = await fetch('/api/advertisements/consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ choice, sessionId: choice === 'rejected' ? sessionId : null }),
      });
      const result = await parseResponse(response);
      if (!response.ok || !result.success) throw new Error(result.error || 'Unable to save your advertising preference.');
      const warning = typeof result.warning === 'string' ? result.warning : null;
      if (choice === 'rejected') {
        sessionStorage.removeItem('pv-local-ad-session:v1');
        setSessionId(null);
      }
      setPreferenceOpen(false);
      await refresh();
      if (warning) setError(warning);
    } catch (choiceError) {
      if (choice === 'rejected') {
        sessionStorage.removeItem('pv-local-ad-session:v1');
        setSessionId(null);
        setData((current) => current ? { ...current, localAdsConsent: false, localAdsChoice: 'rejected', campaigns: [] } : current);
        setPreferenceOpen(false);
      }
      setError(choiceError instanceof Error ? choiceError.message : 'Unable to save your advertising preference.');
    } finally {
      setSavingChoice(false);
    }
  }

  useEffect(() => {
    if (!data?.localAdsConsent || !data.localAdsEnabled || !sessionId) return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting || entry.intersectionRatio < 0.5) continue;
        const campaignId = entry.target.getAttribute('data-local-ad-id');
        if (!campaignId || reported.current.has(campaignId)) continue;
        reported.current.add(campaignId);
        void fetch('/api/advertisements/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId, kind: 'impression', sessionId }),
          keepalive: true,
        }).catch(() => undefined);
      }
    }, { threshold: 0.5 });
    placementRef.current?.querySelectorAll('[data-local-ad-id]').forEach((element) => observer.observe(element));
    return () => observer.disconnect();
  }, [data, sessionId]);

  async function reportClick(campaignId: string) {
    if (!sessionId || !data?.localAdsConsent) return;
    await fetch('/api/advertisements/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, kind: 'click', sessionId }),
      keepalive: true,
    }).catch(() => undefined);
  }

  if (loading) return null;
  if (!data || (!data.localAdsEnabled && !data.adsense)) return error ? <p role="status" className="my-3 text-xs text-stone-500">{error}</p> : null;

  const needsLocalConsent = data.localAdsEnabled && (!data.localAdsChoice || preferenceOpen);
  return (
    <section ref={placementRef} aria-label="Sponsored advertisements" className="my-5 space-y-3">
      {needsLocalConsent ? (
        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
          <p className="font-semibold text-stone-900">Local business advertisements</p>
          <p className="mt-1 text-sm leading-5 text-stone-600">Choose whether to view sponsored local business offers. If allowed, we store a random session identifier and count approximate impressions and clicks once per campaign per day. No measurement runs before you opt in. You can change this choice here at any time.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={savingChoice} onClick={() => void chooseConsent('accepted')} className="min-h-11 rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Allow local sponsored ads</button>
            <button type="button" disabled={savingChoice} onClick={() => void chooseConsent('rejected')} className="min-h-11 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 disabled:opacity-50">Decline</button>
          </div>
        </div>
      ) : null}

      {data.localAdsEnabled && data.localAdsConsent && !preferenceOpen ? (
        <div className="flex justify-end"><button type="button" onClick={() => setPreferenceOpen(true)} className="text-xs text-stone-500 underline underline-offset-2">Ad preferences</button></div>
      ) : null}
      {data.localAdsEnabled && data.localAdsChoice === 'rejected' && !preferenceOpen ? (
        <div className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2 text-xs text-stone-600"><span>Local advertisements are hidden by your preference.</span><button type="button" onClick={() => setPreferenceOpen(true)} className="shrink-0 underline underline-offset-2">Change preference</button></div>
      ) : null}
      {data.localAdsEnabled && data.localAdsConsent && sessionId && !preferenceOpen
        ? data.campaigns.map((campaign) => (
          <article key={campaign._id} data-local-ad-id={campaign._id} className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm">
            <a
              href={campaign.destinationUrl}
              target="_blank"
              rel="sponsored nofollow noopener noreferrer"
              onClick={() => { void reportClick(campaign._id); }}
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
