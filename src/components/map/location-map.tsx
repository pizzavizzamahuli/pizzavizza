'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, useState } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, useMap, useMapEvents } from 'react-leaflet';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const storeIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [24, 38],
  iconAnchor: [12, 38],
  shadowSize: [41, 41],
});

export type MapPoint = {
  latitude: number;
  longitude: number;
};

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, Math.max(map.getZoom(), 13));
  }, [center, map]);
  return null;
}

function MapPicker({ value, onChange, disabled = false }: { value?: MapPoint | null; onChange: (next: MapPoint) => void; disabled?: boolean }) {
  const [current, setCurrent] = useState<MapPoint | null>(value ?? null);

  useEffect(() => {
    if (value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrent(value);
    }
  }, [value]);

  useMapEvents({
    click(event) {
      if (disabled) return;
      const next = { latitude: event.latlng.lat, longitude: event.latlng.lng };
      setCurrent(next);
      onChange(next);
    },
  });

  if (!current) return null;

  return (
    <Marker
      position={[current.latitude, current.longitude]}
      icon={markerIcon}
      draggable={!disabled}
      eventHandlers={{
        dragend(event) {
          if (disabled) return;
          const marker = event.target;
          const next = { latitude: marker.getLatLng().lat, longitude: marker.getLatLng().lng };
          setCurrent(next);
          onChange(next);
        },
      }}
    />
  );
}

export default function LocationMap({
  value,
  onChange,
  height = 320,
  disabled = false,
  center,
  storeLocation,
  customerLocation,
  routeCoordinates,
}: {
  value?: MapPoint | null;
  onChange?: (next: MapPoint) => void;
  height?: number;
  disabled?: boolean;
  center?: MapPoint | null;
  storeLocation?: MapPoint | null;
  customerLocation?: MapPoint | null;
  routeCoordinates?: MapPoint[];
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const mapCenter = useMemo((): [number, number] | null => {
    if (center && Number.isFinite(center.latitude) && Number.isFinite(center.longitude)) return [center.latitude, center.longitude];
    if (customerLocation && Number.isFinite(customerLocation.latitude) && Number.isFinite(customerLocation.longitude)) return [customerLocation.latitude, customerLocation.longitude];
    if (storeLocation && Number.isFinite(storeLocation.latitude) && Number.isFinite(storeLocation.longitude)) return [storeLocation.latitude, storeLocation.longitude];
    if (value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) return [value.latitude, value.longitude];
    return null;
  }, [center, customerLocation, storeLocation, value]);

  if (!mounted) {
    return <div className="rounded-md border border-stone-200 bg-stone-50" style={{ height }} />;
  }

  if (!mapCenter) {
    return (
      <div className="flex items-center justify-center rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-600" style={{ height }}>
        Map is unavailable until the restaurant location is set or a valid delivery point is selected.
      </div>
    );
  }

  const polyline = routeCoordinates && routeCoordinates.length > 1 ? routeCoordinates.map((p) => [p.latitude, p.longitude] as [number, number]) : [];

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-stone-50" style={{ height }}>
      <MapContainer center={mapCenter} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <MapCenter center={mapCenter} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {storeLocation && Number.isFinite(storeLocation.latitude) && Number.isFinite(storeLocation.longitude) ? (
          <Marker position={[storeLocation.latitude, storeLocation.longitude]} icon={storeIcon} />
        ) : null}
        {customerLocation && Number.isFinite(customerLocation.latitude) && Number.isFinite(customerLocation.longitude) ? (
          <Marker position={[customerLocation.latitude, customerLocation.longitude]} icon={markerIcon} />
        ) : null}
        {polyline.length > 1 ? <Polyline positions={polyline} pathOptions={{ color: '#f59e0b', weight: 5 }} /> : null}
        {typeof onChange === 'function' ? <MapPicker value={value ?? null} onChange={onChange} disabled={disabled} /> : null}
      </MapContainer>
    </div>
  );
}
