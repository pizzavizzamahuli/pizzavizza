export type MapLocation = {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
};

export interface MapProvider {
  geocodeAddress(address: string): Promise<MapLocation | null>;
  getDistanceKm(originLat: number, originLng: number, destLat: number, destLng: number): Promise<number | null>;
  generateMapLink(latitude: number, longitude: number, label?: string): string;
}

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}

export const osmMapProvider: MapProvider = {
  async geocodeAddress(address) {
    const trimmed = address.trim();
    if (!trimmed) return null;

    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(trimmed)}`, {
        headers: {
          'Accept-Language': 'en',
          'User-Agent': 'PizzaVizza/1.0',
        },
      });

      if (!response.ok) return null;
      const data = (await response.json()) as Array<{ lat?: string; lon?: string; display_name?: string }>;
      const first = data[0];
      if (!first || !first.lat || !first.lon) return null;

      const latitude = Number(first.lat);
      const longitude = Number(first.lon);
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

      return {
        latitude,
        longitude,
        formattedAddress: first.display_name || trimmed,
      };
    } catch {
      return null;
    }
  },
  async getDistanceKm(originLat, originLng, destLat, destLng) {
    return haversineDistanceKm(originLat, originLng, destLat, destLng);
  },
  generateMapLink(latitude, longitude, label) {
    const query = label ? `${label} @ ${latitude},${longitude}` : `${latitude},${longitude}`;
    const encoded = encodeURIComponent(query);
    return `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}&query=${encoded}#map=16/${latitude}/${longitude}`;
  },
};

export async function geocodeAddress(address: string): Promise<MapLocation | null> {
  return osmMapProvider.geocodeAddress(address);
}

export async function getDistanceKm(originLat: number, originLng: number, destLat: number, destLng: number): Promise<number | null> {
  return osmMapProvider.getDistanceKm(originLat, originLng, destLat, destLng);
}

export function generateMapLink(latitude: number, longitude: number, label?: string): string {
  return osmMapProvider.generateMapLink(latitude, longitude, label);
}
