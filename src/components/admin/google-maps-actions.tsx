'use client';

import { useMemo, useState } from 'react';

type GoogleMapsActionsProps = {
  storeLocation: { latitude: number; longitude: number } | null;
  customerLocation: { latitude: number; longitude: number } | null;
};

function isValidLocation(location: GoogleMapsActionsProps['customerLocation']) {
  return Boolean(
    location &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude) &&
      location.latitude >= -90 &&
      location.latitude <= 90 &&
      location.longitude >= -180 &&
      location.longitude <= 180,
  );
}

export default function GoogleMapsActions({ storeLocation, customerLocation }: GoogleMapsActionsProps) {
  const [status, setStatus] = useState<string | null>(null);
  const hasCustomerLocation = isValidLocation(customerLocation);
  const hasStoreLocation = isValidLocation(storeLocation);
  const validCustomerLocation = hasCustomerLocation ? customerLocation : null;
  const validStoreLocation = hasStoreLocation ? storeLocation : null;
  const locationUrl = useMemo(
    () => validCustomerLocation ? `https://www.google.com/maps/search/?api=1&query=${validCustomerLocation.latitude},${validCustomerLocation.longitude}` : null,
    [validCustomerLocation],
  );
  const directionsUrl = useMemo(
    () => validStoreLocation && validCustomerLocation
      ? `https://www.google.com/maps/dir/?api=1&origin=${validStoreLocation.latitude},${validStoreLocation.longitude}&destination=${validCustomerLocation.latitude},${validCustomerLocation.longitude}&travelmode=driving`
      : null,
    [validCustomerLocation, validStoreLocation],
  );

  async function copyLink() {
    if (!locationUrl) {
      setStatus('Customer location coordinates are unavailable for this order.');
      return;
    }
    try {
      await navigator.clipboard.writeText(locationUrl);
      setStatus('Google Maps link copied.');
    } catch {
      setStatus('Copy failed. Please use Open in Google Maps instead.');
    }
  }

  async function shareLocation() {
    if (!locationUrl) {
      setStatus('Customer location coordinates are unavailable for this order.');
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Customer delivery location', url: locationUrl });
        setStatus('Location shared.');
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') return;
        setStatus('Sharing failed. Google Maps link is ready to copy.');
      }
      return;
    }
    await copyLink();
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap gap-2">
        {locationUrl ? <a href={locationUrl} target="_blank" rel="noreferrer" className="rounded-full bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700">Open in Google Maps</a> : null}
        {directionsUrl ? <a href={directionsUrl} target="_blank" rel="noreferrer" className="rounded-full bg-stone-900 px-3 py-2 text-sm font-semibold text-white hover:bg-stone-700">Navigate to Customer</a> : null}
        {locationUrl ? <button type="button" onClick={copyLink} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Copy Google Maps Link</button> : null}
        {locationUrl ? <button type="button" onClick={shareLocation} className="rounded-full border border-stone-300 bg-white px-3 py-2 text-sm font-semibold text-stone-700 hover:bg-stone-50">Share Location</button> : null}
      </div>
      {!hasCustomerLocation ? <p className="text-sm text-amber-700">Customer coordinates were not saved with this order, so Google Maps actions are unavailable.</p> : null}
      {hasCustomerLocation && !hasStoreLocation ? <p className="text-sm text-amber-700">Store coordinates are not configured. You can open the customer location, but navigation needs the store location.</p> : null}
      {status ? <p className="text-sm text-stone-600" role="status">{status}</p> : null}
    </div>
  );
}
