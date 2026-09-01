'use client';

import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useEffect, useState } from 'react';
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet';

const markerIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export type MapPoint = {
  latitude: number;
  longitude: number;
};

function MapPicker({ value, onChange, disabled = false }: { value?: MapPoint | null; onChange: (next: MapPoint) => void; disabled?: boolean }) {
  const [current, setCurrent] = useState<MapPoint | null>(value ?? null);

  useEffect(() => {
    if (value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)) {
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
}: {
  value?: MapPoint | null;
  onChange: (next: MapPoint) => void;
  height?: number;
  disabled?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const center: [number, number] = value && Number.isFinite(value.latitude) && Number.isFinite(value.longitude)
    ? [value.latitude, value.longitude]
    : [28.6139, 77.2090];

  if (!mounted) {
    return <div className="rounded-md border border-stone-200 bg-stone-50" style={{ height }} />;
  }

  return (
    <div className="overflow-hidden rounded-md border border-stone-200 bg-stone-50" style={{ height }}>
      <MapContainer center={center} zoom={13} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapPicker value={value ?? null} onChange={onChange} disabled={disabled} />
      </MapContainer>
    </div>
  );
}
