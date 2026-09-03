export type MapLocation = {
  latitude: number;
  longitude: number;
  formattedAddress?: string;
};

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RouteSummary = {
  distanceKm: number | null;
  durationMinutes: number | null;
  coordinates: RoutePoint[];
};

export interface MapProvider {
  geocodeAddress(address: string): Promise<MapLocation | null>;
  getDistanceKm(originLat: number, originLng: number, destLat: number, destLng: number): Promise<number | null>;
  getRouteSummary(originLat: number, originLng: number, destLat: number, destLng: number): Promise<RouteSummary | null>;
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
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false&geometries=geojson`,
        { headers: { Accept: 'application/json' } },
      );
      if (!response.ok) return haversineDistanceKm(originLat, originLng, destLat, destLng);
      const data = (await response.json()) as { routes?: Array<{ distance?: number }> };
      const distance = data?.routes?.[0]?.distance;
      if (typeof distance === 'number' && Number.isFinite(distance)) {
        return distance / 1000;
      }
    } catch {
      // fallback to geodesic estimate
    }
    return haversineDistanceKm(originLat, originLng, destLat, destLng);
  },
  async getRouteSummary(originLat, originLng, destLat, destLng) {
    try {
      const response = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=full&geometries=geojson`,
        { headers: { Accept: 'application/json' } },
      );
      if (!response.ok) return null;
      const data = (await response.json()) as { routes?: Array<{ distance?: number; duration?: number; geometry?: { coordinates?: Array<[number, number]> } }> };
      const route = data?.routes?.[0];
      if (!route) return null;
      const coordinates = (route.geometry?.coordinates || [])
        .map(([lng, lat]) => ({ latitude: lat, longitude: lng }))
        .filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
      if (!coordinates.length) return null;
      return {
        distanceKm: typeof route.distance === 'number' ? route.distance / 1000 : null,
        durationMinutes: typeof route.duration === 'number' ? route.duration / 60 : null,
        coordinates,
      };
    } catch {
      return null;
    }
  },
  generateMapLink(latitude, longitude) {
    return `https://www.google.com/maps?q=${latitude},${longitude}`;
  },
};

export async function geocodeAddress(address: string): Promise<MapLocation | null> {
  return osmMapProvider.geocodeAddress(address);
}

export async function getDistanceKm(originLat: number, originLng: number, destLat: number, destLng: number): Promise<number | null> {
  return osmMapProvider.getDistanceKm(originLat, originLng, destLat, destLng);
}

export async function getRouteSummary(originLat: number, originLng: number, destLat: number, destLng: number): Promise<RouteSummary | null> {
  return osmMapProvider.getRouteSummary(originLat, originLng, destLat, destLng);
}

export function generateMapLink(latitude: number, longitude: number, label?: string): string {
  return osmMapProvider.generateMapLink(latitude, longitude, label);
}
