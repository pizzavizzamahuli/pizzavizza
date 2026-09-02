"use client";

import React, { useEffect, useState } from 'react';
import LocationMap from '@/src/components/map/location-map';
import { geocodeAddress } from '@/src/services/map-provider';

export default function RestaurantSettingsForm() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [settings, setSettings] = useState<any>(null);

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

      setSettings((current: any) => ({
        ...current,
        latitude: result.latitude,
        longitude: result.longitude,
        addressLine1: result.formattedAddress || current.addressLine1 || trimmed,
      }));
      setSearchTerm('');
    } catch (e: any) {
      alert(e?.message || 'Address lookup failed');
    } finally {
      setSearching(false);
    }
  }

  if (loading) return <div>Loading...</div>;
  if (!settings) return <div>Unable to load settings.</div>;

  async function save() {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/settings/restaurant', { method: 'PUT', body: JSON.stringify(settings), headers: { 'Content-Type': 'application/json' } });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Save failed');
      setSettings(data.data);
      alert('Saved');
    } catch (e: any) {
      alert('Save failed: ' + (e?.message || String(e)));
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
        onChange={(point) => setSettings((current: any) => ({ ...current, latitude: point.latitude, longitude: point.longitude }))}
        height={320}
        center={
          typeof settings.latitude === 'number' && typeof settings.longitude === 'number'
            ? { latitude: settings.latitude, longitude: settings.longitude }
            : null
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div>
          <label className="block text-sm font-medium">Latitude</label>
          <input className="input" value={settings.latitude ?? ''} onChange={(e) => setSettings({ ...settings, latitude: Number(e.target.value) || null })} />
        </div>
        <div>
          <label className="block text-sm font-medium">Longitude</label>
          <input className="input" value={settings.longitude ?? ''} onChange={(e) => setSettings({ ...settings, longitude: Number(e.target.value) || null })} />
        </div>
        <div>
          <label className="block text-sm font-medium">Delivery Radius</label>
          <input className="input" value={settings.deliveryRadius ?? 0} onChange={(e) => setSettings({ ...settings, deliveryRadius: Number(e.target.value) || 0 })} />
        </div>
        <div>
          <label className="block text-sm font-medium">Radius Unit</label>
          <select className="input" value={settings.deliveryRadiusUnit ?? 'KM'} onChange={(e) => setSettings({ ...settings, deliveryRadiusUnit: e.target.value === 'MILES' ? 'MILES' : 'KM' })}>
            <option value="KM">Kilometers</option>
            <option value="MILES">Miles</option>
          </select>
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

      <div>
        <button className="btn" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save Settings'}</button>
      </div>
    </div>
  );
}
