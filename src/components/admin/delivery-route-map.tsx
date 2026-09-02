'use client';

import dynamic from 'next/dynamic';
import { useMemo } from 'react';

const LocationMap = dynamic(() => import('@/src/components/map/location-map'), { ssr: false });

type MapPoint = { latitude: number; longitude: number };

type DeliveryRouteMapProps = {
  storeLocation?: MapPoint | null;
  customerLocation?: MapPoint | null;
  routeCoordinates?: MapPoint[];
  distanceKm?: number | null;
  etaMinutes?: number | null;
  label?: string;
  height?: number;
};

export default function DeliveryRouteMap({
  storeLocation,
  customerLocation,
  routeCoordinates,
  distanceKm,
  etaMinutes,
  label,
  height = 320,
}: DeliveryRouteMapProps) {
  const center = useMemo(() => {
    if (customerLocation) return customerLocation;
    if (storeLocation) return storeLocation;
    return null;
  }, [customerLocation, storeLocation]);

  if (!center) {
    return (
      <div className="flex h-[320px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-6 text-sm text-stone-600">
        Delivery map is unavailable until a valid customer or store location exists.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-stone-600">
        {typeof distanceKm === 'number' ? <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">Distance: {distanceKm.toFixed(1)} km</span> : null}
        {typeof etaMinutes === 'number' ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">ETA: {Math.max(1, Math.round(etaMinutes))} min</span> : null}
        {label ? <span className="rounded-full bg-stone-100 px-2 py-1 text-stone-700">{label}</span> : null}
      </div>
      <LocationMap
        center={center}
        height={height}
        storeLocation={storeLocation}
        customerLocation={customerLocation}
        routeCoordinates={routeCoordinates}
      />
    </div>
  );
}
