'use client';

import dynamic from 'next/dynamic';

export type MapPoint = {
  latitude: number;
  longitude: number;
};

type LocationMapProps = {
  value?: MapPoint | null;
  onChange?: (next: MapPoint) => void;
  height?: number;
  disabled?: boolean;
  center?: MapPoint | null;
  storeLocation?: MapPoint | null;
  customerLocation?: MapPoint | null;
  routeCoordinates?: MapPoint[];
};

const LocationMapClient = dynamic<LocationMapProps>(() => import('./location-map-client'), {
  ssr: false,
  loading: () => <div className="h-80 rounded-md border border-stone-200 bg-stone-50" />,
});

export default function LocationMap(props: LocationMapProps) {
  return <LocationMapClient {...props} />;
}
