/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from 'react';
import LocationMap from '@/src/components/map/location-map';
import { geocodeAddress } from '@/src/services/map-provider';

type HomepageImage = {
  id: string;
  imageUrl: string;
  description?: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export default function RestaurantSettingsForm({ isMainAdmin = false }: { isMainAdmin?: boolean }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [menuFile, setMenuFile] = useState<File | null>(null);
  const [menuPreview, setMenuPreview] = useState<string | null>(null);
  const [homeFile, setHomeFile] = useState<File | null>(null);
  const [homePreview, setHomePreview] = useState<string | null>(null);
  const [homeDraftDescription, setHomeDraftDescription] = useState('');

  useEffect(() => {
    if (!logoFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLogoPreview(null);
      return;
    }
    const preview = URL.createObjectURL(logoFile);
    setLogoPreview(preview);
    return () => { URL.revokeObjectURL(preview); };
  }, [logoFile]);

  useEffect(() => {
    if (!menuFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMenuPreview(null);
      return;
    }
    const preview = URL.createObjectURL(menuFile);
    setMenuPreview(preview);
    return () => { URL.revokeObjectURL(preview); };
  }, [menuFile]);

  useEffect(() => {
    if (!homeFile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHomePreview(null);
      return;
    }
    const preview = URL.createObjectURL(homeFile);
    setHomePreview(preview);
    return () => { URL.revokeObjectURL(preview); };
  }, [homeFile]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const res = await fetch('/api/admin/settings/restaurant');
        const data = await res.json();
        if (mounted) setSettings(data.data || null);
      } catch (e) {
        console.error('Failed to load settings', e);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    load();
    return () => {
      mounted = false;
    };
  }, []);

  async function searchAddress() {
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    setSearching(true);
    try {
      const result = await geocodeAddress(trimmed);
      if (!result) {
        throw new Error('No location found for that address.');
      }

      setSettings((current: Record<string, unknown>) => ({
        ...current,
        latitude: result.latitude,
        longitude: result.longitude,
        addressLine1: result.formattedAddress || (current.addressLine1 as string | undefined) || trimmed,
      }));
      setSearchTerm('');
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      alert((err?.message as string) || 'Address lookup failed');
    } finally {
      setSearching(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!settings) return <div>Unable to load settings.</div>;

  async function save() {
    setSaving(true);
    try {
      const previousLogo = settings.logo || null;
      const previousMenuImage = settings.menuImage || null;
      const previousHomepageImages: HomepageImage[] = Array.isArray(settings.homepageImages)
        ? settings.homepageImages
        : settings.homeImage ? [{ id: `legacy-${Date.now()}`, imageUrl: settings.homeImage, description: settings.homeDescription || null, sortOrder: 0, isActive: true }] : [];
      let nextLogo = settings.logo || null;
      let nextMenuImage = settings.menuImage || null;
      let nextHomepageImages = previousHomepageImages;
      if (logoFile) {
        const body = new FormData();
        body.append('logo', logoFile);
        const uploadResponse = await fetch('/api/admin/settings/restaurant/logo', { method: 'POST', body });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData.success) throw new Error(uploadData.error || 'Logo upload failed');
        nextLogo = uploadData.data;
      }
      if (menuFile) {
        const body = new FormData();
        body.append('menuImage', menuFile);
        const uploadResponse = await fetch('/api/admin/settings/restaurant/menu-image', { method: 'POST', body });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData.success) throw new Error(uploadData.error || 'Menu upload failed');
        nextMenuImage = uploadData.data;
      }
      if (homeFile) {
        const body = new FormData();
        body.append('homeImage', homeFile);
        const uploadResponse = await fetch('/api/admin/settings/restaurant/home-image', { method: 'POST', body });
        const uploadData = await uploadResponse.json();
        if (!uploadResponse.ok || !uploadData.success) throw new Error(uploadData.error || 'Homepage image upload failed.');
        nextHomepageImages = [...nextHomepageImages, { id: crypto.randomUUID(), imageUrl: uploadData.data, description: homeDraftDescription.trim() || null, sortOrder: nextHomepageImages.length, isActive: true }];
      }
      nextHomepageImages = nextHomepageImages.map((image, index) => ({ ...image, sortOrder: index }));
      const nextHomeImage = nextHomepageImages[0]?.imageUrl || null;
      const nextHomeDescription = nextHomepageImages[0]?.description || null;
      const res = await fetch('/api/admin/settings/restaurant', {
        method: 'PUT',
        body: JSON.stringify({ ...settings, logo: nextLogo, homeImage: nextHomeImage, homeDescription: nextHomeDescription, homepageImages: nextHomepageImages, menuImage: nextMenuImage }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSettings(data.data);
      setLogoFile(null);
      setMenuFile(null);
      setHomeFile(null);
      setHomeDraftDescription('');
      if (previousLogo && previousLogo !== nextLogo) {
        await fetch(`/api/admin/menu/delete-image?publicId=${encodeURIComponent(previousLogo)}`, { method: 'DELETE' });
      }
      if (previousMenuImage && previousMenuImage !== nextMenuImage) {
        await fetch(`/api/admin/menu/delete-image?publicId=${encodeURIComponent(previousMenuImage)}`, { method: 'DELETE' });
      }
      const nextUrls = new Set(nextHomepageImages.map((image) => image.imageUrl));
      for (const previousImage of previousHomepageImages) {
        if (!nextUrls.has(previousImage.imageUrl)) {
          await fetch(`/api/admin/menu/delete-image?publicId=${encodeURIComponent(previousImage.imageUrl)}`, { method: 'DELETE' });
        }
      }
      alert('Saved');
    } catch (e: unknown) {
      const err = e as Record<string, unknown>;
      alert('Save failed: ' + ((err?.message as string) || String(e)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium">Restaurant Name</label>
          <input className="input" value={settings.restaurantName || ''} onChange={(e) => setSettings({ ...settings, restaurantName: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium">Phone</label>
          <input className="input" value={settings.phone || ''} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-sm font-semibold text-stone-900">Delivery assignment</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block">Assignment mode</span><select className="input" value={settings.deliveryAssignmentMode || 'MANUAL'} onChange={(e) => setSettings({ ...settings, deliveryAssignmentMode: e.target.value })}><option value="MANUAL">Manual assignment</option><option value="AUTOMATIC">Automatic assignment</option><option value="MANUAL_FALLBACK">Automatic with manual fallback</option></select></label>
          <label className="text-sm"><span className="mb-1 block">Assignment strategy</span><select className="input" value={settings.deliveryAssignmentStrategy || 'LOWEST_WORKLOAD'} onChange={(e) => setSettings({ ...settings, deliveryAssignmentStrategy: e.target.value })}><option value="LOWEST_WORKLOAD">Lowest active workload</option><option value="ROUND_ROBIN">Round robin</option><option value="LEAST_RECENT">Least recently assigned</option></select></label>
        </div>
        <p className="mt-3 text-xs text-stone-500">Automatic assignment runs only for READY, payment-eligible delivery orders. Staff must be selected below and available.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">{(settings.deliveryStaff || []).map((staff: { id: string; name: string; status: string }) => <label key={staff.id} className="flex items-center gap-2 rounded-xl border border-stone-200 bg-white p-3 text-sm"><input type="checkbox" checked={(settings.deliveryAssignmentEligibleStaffIds || []).includes(staff.id)} onChange={(e) => setSettings({ ...settings, deliveryAssignmentEligibleStaffIds: e.target.checked ? [...(settings.deliveryAssignmentEligibleStaffIds || []), staff.id] : (settings.deliveryAssignmentEligibleStaffIds || []).filter((id: string) => id !== staff.id) })} /><span className="flex-1">{staff.name}</span><span className="text-xs text-stone-500">{staff.status}</span></label>)}</div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <label className="block text-sm font-medium">Restaurant Logo</label>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          {(logoPreview || settings.logo) ? <img src={logoPreview || settings.logo} alt="Restaurant logo preview" className="h-20 w-20 rounded-full border-4 border-white object-cover shadow" /> : <div className="flex h-20 w-20 items-center justify-center rounded-full bg-amber-600 text-xl font-bold text-white">PV</div>}
          <div>
            <input id="restaurant-logo-picker" type="file" accept="image/*" className="sr-only" onChange={(event) => setLogoFile(event.target.files?.[0] || null)} />
            <label htmlFor="restaurant-logo-picker" className="inline-flex cursor-pointer rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">Choose logo</label>
            {(logoFile || settings.logo) ? <button type="button" onClick={() => { setLogoFile(null); setSettings({ ...settings, logo: null }); }} className="ml-2 rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">Remove</button> : null}
            <p className="mt-2 text-xs text-stone-500">Use a square image for the best circular result.</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <label className="block text-sm font-medium">Restaurant Menu Image</label>
        <p className="mt-1 text-xs text-stone-500">Upload the menu card customers see on the homepage.</p>
        {(menuPreview || settings.menuImage) ? <img src={menuPreview || settings.menuImage} alt="Restaurant menu preview" className="mt-3 max-h-64 w-full rounded-xl border border-stone-200 bg-white object-contain" /> : null}
        <div className="mt-3 flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          <input id="restaurant-menu-picker" type="file" accept="image/*" className="sr-only" onChange={(event) => setMenuFile(event.target.files?.[0] || null)} />
          <label htmlFor="restaurant-menu-picker" className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-amber-700 sm:w-auto">Choose menu image</label>
          {(menuFile || settings.menuImage) ? <button type="button" onClick={() => { setMenuFile(null); setSettings({ ...settings, menuImage: null }); }} className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700 sm:w-auto">Remove menu</button> : null}
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><label className="block text-sm font-medium">Homepage Images</label><p className="mt-1 text-xs text-stone-500">Add as many homepage slides as needed. Each image has its own optional description.</p></div>
          <label htmlFor="restaurant-home-picker" className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-full bg-amber-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-amber-700">+ Add homepage image</label>
        </div>
        <input id="restaurant-home-picker" type="file" accept="image/*" className="sr-only" onChange={(event) => setHomeFile(event.target.files?.[0] || null)} />
        {homePreview ? <div className="mt-4 rounded-xl border border-dashed border-amber-300 bg-white p-3"><p className="text-xs font-semibold text-amber-800">New image to be added</p><img src={homePreview} alt="New homepage preview" className="mt-2 max-h-56 w-full rounded-lg object-contain" /><label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-stone-500">Description</label><textarea value={homeDraftDescription} onChange={(event) => setHomeDraftDescription(event.target.value)} rows={2} maxLength={500} className="input mt-1 w-full" placeholder="Optional description" /></div> : null}
        <div className="mt-4 grid gap-4">
          {(settings.homepageImages || []).map((image: HomepageImage, index: number) => <div key={image.id} className="rounded-xl border border-stone-200 bg-white p-3">
            <img src={image.imageUrl} alt={`Homepage image ${index + 1}`} className="max-h-56 w-full rounded-lg bg-stone-100 object-contain" />
            <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-stone-500">Description</label>
            <textarea value={image.description || ''} onChange={(event) => setSettings({ ...settings, homepageImages: settings.homepageImages.map((item: HomepageImage) => item.id === image.id ? { ...item, description: event.target.value } : item) })} rows={2} maxLength={500} className="input mt-1 w-full" placeholder="Optional description" />
            <button type="button" onClick={() => { if (window.confirm('Delete homepage image?\n\nThis image will be removed from the homepage.')) setSettings({ ...settings, homepageImages: settings.homepageImages.filter((item: HomepageImage) => item.id !== image.id) }); }} className="mt-2 inline-flex min-h-9 rounded-full border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-50">Delete</button>
          </div>)}
        </div>
        <div className="mt-3">
          {homeFile ? <button type="button" onClick={() => { setHomeFile(null); setHomeDraftDescription(''); }} className="rounded-full border border-stone-300 px-4 py-2 text-sm font-semibold text-stone-700">Clear pending image</button> : null}
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium">Address Search</label>
        <div className="flex gap-2">
          <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="input w-full" placeholder="Search restaurant address" />
          <button type="button" className="btn" onClick={searchAddress} disabled={searching}>{searching ? 'Searching...' : 'Search'}</button>
        </div>
      </div>

      <LocationMap
        value={
          typeof settings.latitude === 'number' && typeof settings.longitude === 'number'
            ? { latitude: settings.latitude, longitude: settings.longitude }
            : null
        }
        onChange={(point) => setSettings((current: any) => ({ ...current, latitude: point.latitude, longitude: point.longitude }))} // eslint-disable-line @typescript-eslint/no-explicit-any
        height={320}
        center={
          typeof settings.latitude === 'number' && typeof settings.longitude === 'number'
            ? { latitude: settings.latitude, longitude: settings.longitude }
            : null
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-semibold text-stone-800">Store latitude</label>
          <p className="mb-2 text-xs text-stone-500">Pizza Vizza location coordinate</p>
          <input className="input" value={settings.latitude ?? ''} onChange={(e) => setSettings({ ...settings, latitude: Number(e.target.value) || null })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-800">Store longitude</label>
          <p className="mb-2 text-xs text-stone-500">Pizza Vizza location coordinate</p>
          <input className="input" value={settings.longitude ?? ''} onChange={(e) => setSettings({ ...settings, longitude: Number(e.target.value) || null })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-800">Delivery radius</label>
          <p className="mb-2 text-xs text-stone-500">Maximum delivery distance</p>
          <input className="input" value={settings.deliveryRadius ?? 0} onChange={(e) => setSettings({ ...settings, deliveryRadius: Number(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-800">Delivery radius unit</label>
          <p className="mb-2 text-xs text-stone-500">Unit used for delivery validation</p>
          <select className="input" value={settings.deliveryRadiusUnit ?? 'KM'} onChange={(e) => setSettings({ ...settings, deliveryRadiusUnit: e.target.value === 'MILES' ? 'MILES' : 'KM' })}>
            <option value="KM">Kilometers</option>
            <option value="MILES">Miles</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-800">Delivery pricing mode</label>
          <p className="mb-2 text-xs text-stone-500">Use the configured distance pricing for delivery</p>
          <select className="input" value={settings.deliveryChargeType ?? 'DISTANCE_BASED'} onChange={(e) => setSettings({ ...settings, deliveryChargeType: e.target.value })}>
            <option value="DISTANCE_BASED">Distance based</option>
            <option value="FIXED">Fixed charge</option>
            <option value="FREE">Always free</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-800">Base delivery distance (km)</label>
          <p className="mb-2 text-xs text-stone-500">Distance included in the base charge</p>
          <input type="number" min="0" step="0.1" className="input" value={settings.deliveryBaseDistance ?? 5} onChange={(e) => setSettings({ ...settings, deliveryBaseDistance: Number(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-800">Base delivery charge (INR)</label>
          <p className="mb-2 text-xs text-stone-500">Charge up to the base distance</p>
          <input type="number" min="0" step="0.01" className="input" value={settings.deliveryBaseCharge ?? 50} onChange={(e) => setSettings({ ...settings, deliveryBaseCharge: Number(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-800">Extra charge per km (INR)</label>
          <p className="mb-2 text-xs text-stone-500">Each rounded-up km after base distance</p>
          <input type="number" min="0" step="0.01" className="input" value={settings.deliveryAdditionalChargePerKm ?? 10} onChange={(e) => setSettings({ ...settings, deliveryAdditionalChargePerKm: Number(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="block text-sm font-semibold text-stone-800">Free delivery threshold (INR)</label>
          <p className="mb-2 text-xs text-stone-500">Set zero to disable threshold-based free delivery</p>
          <input type="number" min="0" step="0.01" className="input" value={settings.freeDeliveryMinimumOrder ?? 0} onChange={(e) => setSettings({ ...settings, freeDeliveryMinimumOrder: Number(e.target.value) || 0, freeDeliveryEnabled: Number(e.target.value) > 0 })} />
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-sm font-semibold text-stone-900">Website Controls</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={settings.deliveryEnabled} onChange={(e) => setSettings({ ...settings, deliveryEnabled: e.target.checked })} />
            <span>Delivery Enabled</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={settings.pickupEnabled} onChange={(e) => setSettings({ ...settings, pickupEnabled: e.target.checked })} />
            <span>Pickup Enabled</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={settings.onlinePaymentEnabled} onChange={(e) => setSettings({ ...settings, onlinePaymentEnabled: e.target.checked })} />
            <span>Online Payment Enabled</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={settings.chatbotEnabled ?? true} onChange={(e) => setSettings({ ...settings, chatbotEnabled: e.target.checked })} />
            <span>Chatbot Enabled</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={settings.codEnabled} onChange={(e) => setSettings({ ...settings, codEnabled: e.target.checked })} />
            <span>COD Enabled</span>
          </label>
          <label className="flex items-center space-x-2">
            <input type="checkbox" checked={!!settings.manualPaymentEnabled} onChange={(e) => setSettings({ ...settings, manualPaymentEnabled: e.target.checked })} />
            <span>Manual Payment Enabled</span>
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-sm font-semibold text-stone-900">Manual payment details</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">UPI ID</label>
            <input className="input" value={settings.manualPaymentUpiId || ''} onChange={(e) => setSettings({ ...settings, manualPaymentUpiId: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium">QR code URL</label>
            <input className="input" value={settings.manualPaymentQrUrl || ''} onChange={(e) => setSettings({ ...settings, manualPaymentQrUrl: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium">Bank details</label>
            <textarea className="input min-h-24 w-full" value={settings.manualPaymentBankDetails || ''} onChange={(e) => setSettings({ ...settings, manualPaymentBankDetails: e.target.value })} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-sm font-semibold text-stone-900">Referral programme</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={!!settings.referralEnabled} onChange={(e) => setSettings({ ...settings, referralEnabled: e.target.checked })} /> Referral programme enabled</label>
          <label className="text-sm"><span className="mb-1 block">Referrer reward (INR)</span><input type="number" min="0" className="input" value={settings.referralReferrerRewardAmount ?? 50} onChange={(e) => setSettings({ ...settings, referralReferrerRewardAmount: Number(e.target.value) || 0 })} /></label>
          <label className="text-sm"><span className="mb-1 block">New user reward (INR)</span><input type="number" min="0" className="input" value={settings.referralReferredRewardAmount ?? 50} onChange={(e) => setSettings({ ...settings, referralReferredRewardAmount: Number(e.target.value) || 0 })} /></label>
          <label className="text-sm sm:col-span-2"><span className="mb-1 block">Minimum qualifying order (INR)</span><input type="number" min="0" className="input" value={settings.referralMinimumOrderAmount ?? 300} onChange={(e) => setSettings({ ...settings, referralMinimumOrderAmount: Number(e.target.value) || 0 })} /></label>
        </div>
      </div>

      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-sm font-semibold text-stone-900">Customer Support</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block">Help &amp; Support email</span><input className="input" type="email" value={settings.supportEmail || ''} onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })} placeholder="support@example.com" /></label>
          <label className="text-sm"><span className="mb-1 block">WhatsApp support number</span><input className="input" inputMode="tel" value={settings.whatsappSupportNumber || ''} onChange={(e) => setSettings({ ...settings, whatsappSupportNumber: e.target.value })} placeholder="+91XXXXXXXXXX" /></label>
          <label className="text-sm sm:col-span-2"><span className="mb-1 block">Working hours</span><input className="input" maxLength={200} value={settings.workingHours || ''} onChange={(e) => setSettings({ ...settings, workingHours: e.target.value })} placeholder="Daily, 11:00 AM - 11:00 PM" /></label>
        </div>
        <p className="mt-3 text-xs text-stone-500">Support email and WhatsApp links appear in the public footer after saving.</p>
      </div>

      {isMainAdmin ? <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
        <h2 className="text-sm font-semibold text-stone-900">Footer settings</h2>
        <p className="mt-1 text-xs text-stone-500">Configure the optional Powered By credit shown in the public footer.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm"><span className="mb-1 block">Powered By name</span><input className="input" maxLength={100} value={settings.poweredByName || ''} onChange={(e) => setSettings({ ...settings, poweredByName: e.target.value })} placeholder="ABC Technologies" /></label>
          <label className="text-sm"><span className="mb-1 block">Powered By URL</span><input className="input" type="url" value={settings.poweredByUrl || ''} onChange={(e) => setSettings({ ...settings, poweredByUrl: e.target.value })} placeholder="https://example.com" /></label>
        </div>
        {settings.poweredByName && settings.poweredByUrl ? <p className="mt-4 text-sm text-stone-600">Preview: Powered by <a href={settings.poweredByUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-amber-700">{settings.poweredByName}</a></p> : <p className="mt-4 text-xs text-stone-500">Leave both fields configured to show the Powered By link.</p>}
      </div> : null}

      <div>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>
    </div>
  );
}
