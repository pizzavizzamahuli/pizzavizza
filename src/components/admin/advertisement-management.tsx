'use client';

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react';
import {
  AD_PLACEMENTS,
  defaultAdvertisementSettings,
  type AdvertisementSettings,
  type AdPlacement,
  type LocalAdCampaign,
} from '@/src/types/advertisements';

type CampaignDraft = Omit<LocalAdCampaign, '_id' | 'impressions' | 'clicks' | 'createdAt' | 'updatedAt'>;

const placementLabels: Record<AdPlacement, string> = {
  HOME: 'Homepage',
  MENU: 'Menu',
  PRODUCT: 'Product pages',
  CONTENT: 'Public content',
};

const blankCampaign = (): CampaignDraft => {
  const now = new Date();
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return {
    businessName: '',
    imageUrl: '',
    destinationUrl: '',
    placement: 'HOME',
    startsAt: dateInput(now),
    endsAt: dateInput(end),
    price: 0,
    status: 'PENDING',
    contactEmail: '',
    contactPhone: '',
  };
};

function dateInput(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

async function responseData(response: Response) {
  try {
    return await response.json();
  } catch {
    throw new Error(`The server returned an unreadable response (HTTP ${response.status}).`);
  }
}

export default function AdvertisementManagement({ canManage }: { canManage: boolean }) {
  const [settings, setSettings] = useState<AdvertisementSettings>(defaultAdvertisementSettings);
  const [savedSettings, setSavedSettings] = useState<AdvertisementSettings>(defaultAdvertisementSettings);
  const [campaigns, setCampaigns] = useState<LocalAdCampaign[]>([]);
  const [draft, setDraft] = useState<CampaignDraft>(blankCampaign());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function load() {
    const [settingsResponse, campaignsResponse] = await Promise.all([
      fetch('/api/admin/advertisements/settings'),
      fetch('/api/admin/advertisements/campaigns'),
    ]);
    const [settingsData, campaignsData] = await Promise.all([responseData(settingsResponse), responseData(campaignsResponse)]);
    if (!settingsResponse.ok || !settingsData.success || !campaignsResponse.ok || !campaignsData.success) {
      throw new Error(settingsData.error || campaignsData.error || 'Unable to load advertisement settings.');
    }
    setSettings(settingsData.data as AdvertisementSettings);
    setSavedSettings(settingsData.data as AdvertisementSettings);
    setCampaigns(campaignsData.data as LocalAdCampaign[]);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      void load().catch((loadError: unknown) => {
        setError(loadError instanceof Error ? loadError.message : 'Unable to load advertisements.');
      }).finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(timeout);
  }, []);

  async function saveSettings(next: AdvertisementSettings, section: 'adsense' | 'local') {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const payload = section === 'adsense'
        ? { ...next, localAdsEnabled: savedSettings.localAdsEnabled }
        : { ...savedSettings, localAdsEnabled: next.localAdsEnabled };
      const response = await fetch('/api/admin/advertisements/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await responseData(response);
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save advertising settings.');
      setSettings(data.data as AdvertisementSettings);
      setSavedSettings(data.data as AdvertisementSettings);
      setMessage('Advertising settings saved.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save advertising settings.');
    } finally {
      setBusy(false);
    }
  }

  function updateSlot(placement: AdPlacement, slot: string) {
    setSettings((current) => ({ ...current, adsenseSlots: { ...current.adsenseSlots, [placement]: slot } }));
  }

  async function uploadImage() {
    if (!imageFile) return;
    setUploading(true);
    setError(null);
    try {
      const body = new FormData();
      body.append('image', imageFile);
      const response = await fetch('/api/admin/advertisements/upload', { method: 'POST', body });
      const data = await responseData(response);
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to upload campaign image.');
      setDraft((current) => ({ ...current, imageUrl: data.data as string }));
      setImageFile(null);
      setMessage('Campaign image uploaded.');
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Unable to upload campaign image.');
    } finally {
      setUploading(false);
    }
  }

  async function saveCampaign() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(editingId ? `/api/admin/advertisements/campaigns/${editingId}` : '/api/admin/advertisements/campaigns', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...draft, startsAt: new Date(draft.startsAt).toISOString(), endsAt: new Date(draft.endsAt).toISOString() }),
      });
      const data = await responseData(response);
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to save campaign.');
      setDraft(blankCampaign());
      setEditingId(null);
      await load();
      setMessage(editingId ? 'Campaign updated.' : 'Campaign submitted for approval.');
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save campaign.');
    } finally {
      setBusy(false);
    }
  }

  async function changeStatus(campaign: LocalAdCampaign, status: LocalAdCampaign['status']) {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/advertisements/campaigns/${campaign._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...campaign,
          startsAt: new Date(campaign.startsAt).toISOString(),
          endsAt: new Date(campaign.endsAt).toISOString(),
          status,
        }),
      });
      const data = await responseData(response);
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to change campaign status.');
      await load();
      setMessage(`Campaign ${status.toLowerCase()}.`);
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Unable to change campaign status.');
    } finally {
      setBusy(false);
    }
  }

  async function deleteCampaign(campaign: LocalAdCampaign) {
    if (!window.confirm(`Delete the ${campaign.businessName} campaign?`)) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`/api/admin/advertisements/campaigns/${campaign._id}`, { method: 'DELETE' });
      const data = await responseData(response);
      if (!response.ok || !data.success) throw new Error(data.error || 'Unable to delete campaign.');
      await load();
      if (editingId === campaign._id) cancelEdit();
      setMessage('Campaign deleted.');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Unable to delete campaign.');
    } finally {
      setBusy(false);
    }
  }

  function editCampaign(campaign: LocalAdCampaign) {
    setEditingId(campaign._id || null);
    setDraft({
      businessName: campaign.businessName,
      imageUrl: campaign.imageUrl,
      destinationUrl: campaign.destinationUrl,
      placement: campaign.placement,
      startsAt: dateInput(new Date(campaign.startsAt)),
      endsAt: dateInput(new Date(campaign.endsAt)),
      price: campaign.price,
      status: campaign.status,
      contactEmail: campaign.contactEmail || '',
      contactPhone: campaign.contactPhone || '',
    });
    setError(null);
    setMessage(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(blankCampaign());
    setImageFile(null);
  }

  if (loading) return <p className="text-sm text-stone-500">Loading advertisement management...</p>;

  const fieldClass = 'mt-1 min-h-11 w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm';
  const toggle = (label: string, checked: boolean, onChange: (value: boolean) => void, description: string) => (
    <label className="flex min-h-14 items-center justify-between gap-4 rounded-xl border border-stone-200 bg-white p-4">
      <span><span className="block font-semibold text-stone-900">{label}</span><span className="mt-1 block text-sm text-stone-600">{description}</span></span>
      <input type="checkbox" checked={checked} disabled={!canManage || busy} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 shrink-0 accent-amber-600" />
    </label>
  );

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <div><h2 className="text-lg font-semibold">Google AdSense</h2><p className="mt-1 text-sm text-stone-600">Ads remain off until the site is approved, a Google-certified CMP is configured, and real ad units or Auto ads are provided.</p></div>
        {toggle('Enable Google AdSense', settings.adsenseEnabled, (value) => setSettings({ ...settings, adsenseEnabled: value }), 'Loads Google ad technology only on configured placements after the CMP reports consent. Turning this off does not suspend your Google account.')}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-stone-700">Public publisher ID<input value={settings.adsensePublisherId} disabled={!canManage || busy} onChange={(event) => setSettings({ ...settings, adsensePublisherId: event.target.value })} className={fieldClass} placeholder="ca-pub-..." /></label>
          <label className="text-sm font-medium text-stone-700">Google AdSense approval confirmed<input type="checkbox" checked={settings.adsenseSiteApproved} disabled={!canManage || busy} onChange={(event) => setSettings({ ...settings, adsenseSiteApproved: event.target.checked })} className="ml-3 h-5 w-5 accent-amber-600" /></label>
          <label className="text-sm font-medium text-stone-700">Certified CMP is installed/configured<input type="checkbox" checked={settings.adsenseCmpConfigured} disabled={!canManage || busy} onChange={(event) => setSettings({ ...settings, adsenseCmpConfigured: event.target.checked })} className="ml-3 h-5 w-5 accent-amber-600" /></label>
          <label className="flex items-center gap-3 text-sm font-medium text-stone-700"><input type="checkbox" checked={settings.adsenseAutoAds} disabled={!canManage || busy} onChange={(event) => setSettings({ ...settings, adsenseAutoAds: event.target.checked })} className="h-5 w-5 accent-amber-600" />Use Auto ads (only after setup and approval)</label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {AD_PLACEMENTS.map((placement) => <label key={placement} className="text-sm font-medium text-stone-700">{placementLabels[placement]} ad unit slot ID<input value={settings.adsenseSlots[placement]} disabled={!canManage || busy} onChange={(event) => updateSlot(placement, event.target.value.replace(/\D/g, '').slice(0, 20))} className={fieldClass} placeholder="Leave blank until Google provides a slot ID" inputMode="numeric" /></label>)}
        </div>
        <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-900">
          Do not enter guessed slot IDs. Only configure this after Google approves the site and your selected certified CMP exposes the IAB TCF API (`__tcfapi`). No ad script is loaded when any required setting or Google consent is missing. Update the published Privacy Policy before activation, including ad providers and data use. Review <a className="font-semibold underline" href="https://www.google.com/about/company/user-consent-policy/" target="_blank" rel="noreferrer">Google&apos;s EU user consent policy</a> and <a className="font-semibold underline" href="https://support.google.com/adsense/answer/7670013?hl=en" target="_blank" rel="noreferrer">AdSense consent setup</a>.
        </p>
        {canManage ? <button type="button" disabled={busy} onClick={() => void saveSettings(settings, 'adsense')} className="min-h-11 rounded-full bg-amber-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Saving...' : 'Save AdSense settings'}</button> : null}
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <div><h2 className="text-lg font-semibold">Local business advertisements</h2><p className="mt-1 text-sm text-stone-600">Approved, active campaigns display to all visitors. Visitor impression and click measurement is disabled. Do not click your own ads or encourage customers to click them.</p></div>
        {toggle('Enable local advertisements', settings.localAdsEnabled, (value) => setSettings({ ...settings, localAdsEnabled: value }), 'Global OFF stops local campaign rendering. Existing campaign records remain stored.')}
        {canManage ? <button type="button" disabled={busy} onClick={() => void saveSettings(settings, 'local')} className="min-h-11 rounded-full border border-amber-600 px-5 py-2 font-semibold text-amber-800 disabled:opacity-50">{busy ? 'Saving...' : 'Save local ad settings'}</button> : null}
      </section>

      {canManage ? <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-6">
        <div><h2 className="text-lg font-semibold">{editingId ? 'Edit local campaign' : 'Create a local campaign'}</h2><p className="mt-1 text-sm text-stone-600">New campaigns enter Pending approval. Images must be JPEG, PNG, GIF, or WebP and no larger than 4 MB; destinations must use HTTPS.</p></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-stone-700">Business name<input maxLength={100} value={draft.businessName} onChange={(event) => setDraft({ ...draft, businessName: event.target.value })} className={fieldClass} /></label>
          <label className="text-sm font-medium text-stone-700">Placement<select value={draft.placement} onChange={(event) => setDraft({ ...draft, placement: event.target.value as AdPlacement })} className={fieldClass}>{AD_PLACEMENTS.map((placement) => <option key={placement} value={placement}>{placementLabels[placement]}</option>)}</select></label>
          <label className="text-sm font-medium text-stone-700 sm:col-span-2">HTTPS destination URL<input type="url" value={draft.destinationUrl} onChange={(event) => setDraft({ ...draft, destinationUrl: event.target.value })} className={fieldClass} placeholder="https://business.example" /></label>
          <label className="text-sm font-medium text-stone-700">Start date and time<input type="datetime-local" value={draft.startsAt} onChange={(event) => setDraft({ ...draft, startsAt: event.target.value })} className={fieldClass} /></label>
          <label className="text-sm font-medium text-stone-700">End date and time<input type="datetime-local" value={draft.endsAt} onChange={(event) => setDraft({ ...draft, endsAt: event.target.value })} className={fieldClass} /></label>
          <label className="text-sm font-medium text-stone-700">Campaign price (₹)<input type="number" min="0" max="100000000" step="0.01" value={draft.price} onChange={(event) => setDraft({ ...draft, price: Number(event.target.value) })} className={fieldClass} /></label>
          <label className="text-sm font-medium text-stone-700">Contact email (optional)<input type="email" maxLength={254} value={draft.contactEmail || ''} onChange={(event) => setDraft({ ...draft, contactEmail: event.target.value })} className={fieldClass} /></label>
          <label className="text-sm font-medium text-stone-700">Contact phone (optional)<input type="tel" maxLength={32} value={draft.contactPhone || ''} onChange={(event) => setDraft({ ...draft, contactPhone: event.target.value })} className={fieldClass} /></label>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-stone-700">Banner image<input type="file" accept="image/jpeg,image/png,image/gif,image/webp" onChange={(event) => setImageFile(event.target.files?.[0] || null)} className="mt-2 block w-full text-sm file:mr-3 file:min-h-10 file:rounded-full file:border-0 file:bg-stone-100 file:px-4 file:font-semibold" /></label>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {draft.imageUrl ? <img src={draft.imageUrl} alt="Campaign preview" className="h-24 w-40 rounded-xl border border-stone-200 object-cover" /> : <p className="text-sm text-stone-500">Upload a banner before saving.</p>}
              {imageFile ? <button type="button" disabled={uploading} onClick={() => void uploadImage()} className="min-h-10 rounded-full border border-stone-300 px-4 text-sm font-semibold disabled:opacity-50">{uploading ? 'Uploading...' : 'Upload image'}</button> : null}
            </div>
          </div>
          {editingId ? <label className="text-sm font-medium text-stone-700">Campaign status<select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as CampaignDraft['status'] })} className={fieldClass}>{['DRAFT', 'PENDING', 'APPROVED', 'PAUSED', 'REJECTED'].map((status) => <option key={status} value={status}>{status}</option>)}</select></label> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" disabled={busy || uploading || !draft.imageUrl} onClick={() => void saveCampaign()} className="min-h-11 rounded-full bg-amber-600 px-5 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Saving...' : editingId ? 'Save campaign' : 'Submit campaign for approval'}</button>
          {editingId ? <button type="button" onClick={cancelEdit} className="min-h-11 rounded-full border border-stone-300 px-5 py-2 font-semibold text-stone-700">Cancel edit</button> : null}
        </div>
      </section> : null}

      <section className="space-y-4">
        <div><h2 className="text-lg font-semibold">Campaigns and reporting</h2><p className="mt-1 text-sm text-stone-600">Visitor impression and click measurement is disabled. Any existing approximate event totals expire within 60 days; they are not billing data. Google click reporting is not provided here.</p></div>
        {campaigns.length ? campaigns.map((campaign) => <article key={campaign._id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <img src={campaign.imageUrl} alt={`${campaign.businessName} advertisement preview`} className="h-32 w-full rounded-xl bg-stone-100 object-cover sm:w-48" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-stone-900">{campaign.businessName}</h3><span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800">{campaign.effectiveStatus || campaign.status}</span><span className="rounded-full bg-stone-100 px-2.5 py-1 text-xs text-stone-600">{placementLabels[campaign.placement]}</span></div>
              <p className="mt-2 break-all text-sm text-stone-600">{campaign.destinationUrl}</p>
              <p className="mt-2 text-xs text-stone-500">{new Date(campaign.startsAt).toLocaleString()} – {new Date(campaign.endsAt).toLocaleString()} · ₹{campaign.price}</p>
              <p className="mt-2 text-sm text-stone-700">Approx. impressions: {campaign.impressions || 0} · Clicks: {campaign.clicks || 0}</p>
              {canManage ? <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={() => editCampaign(campaign)} className="min-h-10 rounded-full border border-stone-300 px-3 text-sm font-semibold">Edit</button>
                {campaign.status !== 'APPROVED' ? <button type="button" disabled={busy} onClick={() => void changeStatus(campaign, 'APPROVED')} className="min-h-10 rounded-full border border-emerald-300 px-3 text-sm font-semibold text-emerald-800">Approve / resume</button> : null}
                {campaign.status !== 'PAUSED' ? <button type="button" disabled={busy} onClick={() => void changeStatus(campaign, 'PAUSED')} className="min-h-10 rounded-full border border-amber-300 px-3 text-sm font-semibold text-amber-900">Pause</button> : null}
                {campaign.status !== 'REJECTED' ? <button type="button" disabled={busy} onClick={() => void changeStatus(campaign, 'REJECTED')} className="min-h-10 rounded-full border border-rose-300 px-3 text-sm font-semibold text-rose-800">Reject</button> : null}
                <button type="button" disabled={busy} onClick={() => void deleteCampaign(campaign)} className="min-h-10 rounded-full border border-rose-300 px-3 text-sm font-semibold text-rose-800">Delete</button>
              </div> : null}
            </div>
          </div>
        </article>) : <p className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-sm text-stone-600">No local campaigns have been created.</p>}
      </section>

      {error ? <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
      {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</p> : null}
    </div>
  );
}
