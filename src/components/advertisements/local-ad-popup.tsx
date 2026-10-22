'use client';

/* eslint-disable @next/next/no-img-element */
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AdPopupPage, LocalAdCampaign } from '@/src/types/advertisements';
import { shouldShowPopupForFrequency } from '@/src/utils/advertisements';

type PopupCampaign = Pick<
  LocalAdCampaign,
  | '_id'
  | 'title'
  | 'businessName'
  | 'imageUrl'
  | 'description'
  | 'destinationUrl'
  | 'contactWhatsApp'
  | 'popupFullScreen'
  | 'popupDurationSeconds'
  | 'closeDelaySeconds'
  | 'frequency'
>;

type PopupResponse = {
  success: boolean;
  data?: { campaigns: PopupCampaign[]; today: string };
  error?: string;
};

function pageForPath(pathname: string): AdPopupPage | null {
  if (pathname === '/') return 'HOME';
  if (pathname === '/menu') return 'MENU';
  if (pathname.startsWith('/menu/')) return 'PRODUCT';
  if (pathname === '/dining' || pathname.startsWith('/dining/')) return 'DINING';
  return null;
}

function blockedPath(pathname: string) {
  return [
    '/admin', '/login', '/register', '/forgot-password', '/reset-password', '/verify-email',
    '/cart', '/checkout', '/account', '/kitchen', '/delivery', '/manager', '/dining/bookings',
  ].some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function storageKey(campaignId: string) {
  return `pv-local-ad-popup:${campaignId}`;
}

function wasAlreadyShown(campaign: PopupCampaign, today: string) {
  if (!campaign._id || campaign.frequency === 'EVERY_VISIT') return false;
  try {
    const key = storageKey(campaign._id);
    const seenToday = window.localStorage.getItem(key) === today;
    const seenInSession = window.sessionStorage.getItem(key) === 'shown';
    return !shouldShowPopupForFrequency(campaign.frequency, seenToday, seenInSession);
  } catch (error) {
    console.error('Unable to read local advertisement frequency preference.', error);
    return false;
  }
}

function rememberShown(campaign: PopupCampaign, today: string) {
  if (!campaign._id || campaign.frequency === 'EVERY_VISIT') return;
  try {
    const key = storageKey(campaign._id);
    if (campaign.frequency === 'DAILY') window.localStorage.setItem(key, today);
    else window.sessionStorage.setItem(key, 'shown');
  } catch (error) {
    console.error('Unable to save local advertisement frequency preference.', error);
  }
}

function getTelemetrySessionId() {
  const key = 'pv-local-ad-telemetry-session';
  try {
    const previous = window.sessionStorage.getItem(key);
    if (previous && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(previous)) {
      return previous;
    }
    const next = window.crypto.randomUUID();
    window.sessionStorage.setItem(key, next);
    return next;
  } catch (error) {
    console.error('Unable to initialize local advertisement measurement.', error);
    return null;
  }
}

export async function trackLocalAdEvent(campaignId: string | undefined, kind: 'impression' | 'click') {
  if (!campaignId) return;
  const sessionId = getTelemetrySessionId();
  if (!sessionId) return;
  try {
    const response = await fetch('/api/advertisements/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ campaignId, kind, sessionId }),
      keepalive: kind === 'click',
    });
    if (!response.ok) console.error(`Local advertisement ${kind} could not be recorded.`, response.status);
  } catch (error) {
    console.error(`Local advertisement ${kind} could not be recorded.`, error);
  }
}

function getCloseDelay(campaign: PopupCampaign) {
  const value = campaign.closeDelaySeconds;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 60 ? value : 0;
}

function getDisplayDuration(campaign: PopupCampaign) {
  const value = campaign.popupDurationSeconds;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 3600 ? value : 0;
}

function whatsappUrl(value: string | null | undefined) {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  return digits.length >= 7 ? `https://wa.me/${digits}` : null;
}

export function AdPopupDialog({
  campaign,
  preview = false,
  onDismiss,
  onClick,
}: {
  campaign: PopupCampaign;
  preview?: boolean;
  onDismiss: () => void;
  onClick?: () => void;
}) {
  const delay = getCloseDelay(campaign);
  const duration = getDisplayDuration(campaign);
  const [remaining, setRemaining] = useState(delay);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const deadline = Date.now() + delay * 1000;
    if (delay === 0) return;
    const interval = window.setInterval(() => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) window.clearInterval(interval);
    }, 200);
    return () => window.clearInterval(interval);
  }, [campaign._id, delay]);

  useEffect(() => {
    if (duration === 0) return;
    const timeout = window.setTimeout(onDismiss, Math.max(duration, delay + 1) * 1000);
    return () => window.clearTimeout(timeout);
  }, [campaign._id, delay, duration, onDismiss]);

  useEffect(() => {
    if (remaining === 0) closeButtonRef.current?.focus();
  }, [remaining]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && remaining === 0) onDismiss();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDismiss, remaining]);

  const closeLabel = remaining > 0 ? `Close available in ${remaining}s` : 'Close advertisement';
  const contactUrl = whatsappUrl(campaign.contactWhatsApp);
  const fullScreen = campaign.popupFullScreen === true;

  return (
    <div className={`fixed inset-0 z-[150] flex overflow-y-auto bg-black/65 ${fullScreen ? 'items-start' : 'items-center justify-center p-3 sm:p-6'}`} data-testid="local-ad-popup">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="local-ad-popup-title"
        className={`relative flex w-full flex-col bg-white shadow-2xl ${fullScreen ? 'min-h-full max-w-none overflow-y-auto rounded-none' : 'my-auto max-w-xl overflow-hidden rounded-2xl sm:rounded-3xl'}`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3 sm:px-6">
          <span className="inline-flex rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide text-stone-700">Sponsored Advertisement · विज्ञापन</span>
          {preview ? <span className="text-xs font-semibold text-amber-800">Preview</span> : null}
        </div>
        {campaign.imageUrl ? (
          <a
            href={campaign.destinationUrl || undefined}
            target={preview ? undefined : '_blank'}
            rel={preview ? undefined : 'sponsored nofollow noopener noreferrer'}
            tabIndex={preview ? -1 : 0}
            aria-label={`Visit ${campaign.businessName}`}
            onClick={(event) => {
              if (preview || !campaign.destinationUrl) {
                event.preventDefault();
                return;
              }
              onClick?.();
            }}
            className="flex items-center justify-center bg-stone-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-amber-600"
          >
            <img src={campaign.imageUrl} alt={`${campaign.businessName} advertisement`} className={`${fullScreen ? 'max-h-[60dvh]' : 'max-h-[42dvh] sm:max-h-[48dvh]'} w-full object-contain`} />
          </a>
        ) : <div className="flex min-h-40 items-center justify-center bg-stone-100 text-sm text-stone-500">Advertisement banner preview</div>}
        <div className="space-y-3 p-4 sm:p-6">
          <div>
            <p className="text-sm font-semibold text-amber-800">{campaign.businessName}</p>
            <h2 id="local-ad-popup-title" className="mt-1 text-xl font-bold text-stone-900 sm:text-2xl">{campaign.title || campaign.businessName || 'Local business'}</h2>
            {campaign.description ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-stone-600">{campaign.description}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-3 border-t border-stone-100 pt-3">
            {!preview && contactUrl ? <a href={contactUrl} target="_blank" rel="nofollow noopener noreferrer" className="min-h-11 rounded-full border border-emerald-700 px-4 py-2 text-sm font-semibold text-emerald-800">WhatsApp business</a> : null}
            <button
              ref={closeButtonRef}
              type="button"
              disabled={remaining > 0}
              onClick={onDismiss}
              className="ml-auto min-h-11 rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white transition hover:bg-stone-700 disabled:cursor-wait disabled:opacity-70"
              aria-label={closeLabel}
            >
              {closeLabel}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function LocalAdPopup() {
  const pathname = usePathname();
  const [campaign, setCampaign] = useState<PopupCampaign | null>(null);
  const [frequencyDate, setFrequencyDate] = useState('');
  const [popupPath, setPopupPath] = useState<string | null>(null);
  const activeCampaign = useRef<PopupCampaign | null>(null);
  const activePath = useRef<string | null>(null);
  const shownInDocument = useRef(false);
  const dismissed = useCallback(() => {
    activeCampaign.current = null;
    activePath.current = null;
    setCampaign(null);
    setPopupPath(null);
  }, []);

  useEffect(() => {
    const page = blockedPath(pathname) ? null : pageForPath(pathname);
    if (!page) {
      activeCampaign.current = null;
      activePath.current = null;
      const clearPopup = window.setTimeout(() => {
        setCampaign(null);
        setPopupPath(null);
      }, 0);
      return () => window.clearTimeout(clearPopup);
    }

    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetch(`/api/advertisements/popup?page=${page}`, { cache: 'no-store' });
        const result = await response.json() as PopupResponse;
        if (!response.ok || !result.success || !result.data) {
          throw new Error(result.error || 'Unable to load local advertisements.');
        }
        if (cancelled) return;
        const campaigns = result.data.campaigns || [];
        const current = activeCampaign.current;
        if (current) {
          if (activePath.current !== pathname) {
            activeCampaign.current = null;
            activePath.current = null;
            shownInDocument.current = true;
            setCampaign(null);
            setPopupPath(null);
            return;
          }
          const stillActive = campaigns.find((item) => item._id === current._id);
          activeCampaign.current = stillActive || null;
          if (!stillActive) {
            activePath.current = null;
            setPopupPath(null);
          }
          setCampaign(stillActive || null);
          return;
        }
        if (shownInDocument.current) return;
        const today = result.data.today;
        const next = campaigns.find((item) => !wasAlreadyShown(item, today));
        if (!next) return;
        rememberShown(next, today);
        shownInDocument.current = true;
        activeCampaign.current = next;
        activePath.current = pathname;
        setFrequencyDate(today);
        setPopupPath(pathname);
        setCampaign(next);
      } catch (error) {
        if (!cancelled) console.error('Unable to load local advertisement popup.', error);
      }
    };

    void load();
    const interval = window.setInterval(() => { void load(); }, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [pathname]);

  const campaignId = campaign?._id;
  useEffect(() => {
    if (campaignId) void trackLocalAdEvent(campaignId, 'impression');
  }, [campaignId]);

  if (!campaign || popupPath !== pathname) return null;
  return (
    <AdPopupDialog
      key={`${campaign._id || 'campaign'}-${frequencyDate}-${campaign.closeDelaySeconds || 0}`}
      campaign={campaign}
      onDismiss={dismissed}
      onClick={() => { void trackLocalAdEvent(campaign._id, 'click'); }}
    />
  );
}
