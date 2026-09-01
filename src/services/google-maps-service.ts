import { MapLocation, osmMapProvider } from '@/src/services/map-provider';

export type GeocodeResult = MapLocation | null;

export async function geocodeAddress(address: string): Promise<GeocodeResult> {
  return osmMapProvider.geocodeAddress(address);
}

export async function getDrivingDistanceKm(originLat: number, originLng: number, destLat: number, destLng: number): Promise<number | null> {
  return osmMapProvider.getDistanceKm(originLat, originLng, destLat, destLng);
}
