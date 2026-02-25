/**
 * Flights layer data service.
 * Fetches tracked flights from the local API and exposes a simple
 * array of FlightPoint objects for the map layer.
 */

export interface FlightPoint {
  id: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
  heading: number;
  origin: string;
  operator: string;
  aircraftType: string;
}

interface RawFlightItem {
  icao24?: string;
  id?: string;
  callsign?: string;
  hexCode?: string;
  lat?: number;
  lon?: number;
  location?: { latitude: number; longitude: number };
  altitude?: number;
  velocity?: number;
  speed?: number;
  heading?: number;
  origin?: string;
  originCountry?: string;
  operator?: string;
  aircraftType?: string;
  onGround?: boolean;
}

export async function fetchFlightsForMap(): Promise<FlightPoint[]> {
  try {
    const resp = await fetch('/api/military/v1/list-military-flights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boundingBox: {
          southWest: { latitude: 35.5, longitude: 6.5 },
          northEast: { latitude: 47.5, longitude: 19.0 },
        },
        operator: 'MILITARY_OPERATOR_UNSPECIFIED',
        aircraftType: 'MILITARY_AIRCRAFT_TYPE_UNSPECIFIED',
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) return [];
    const data = await resp.json();

    // Support both formats: { flights: [...] } (generated proto) and { items: [...] } (server)
    const items: RawFlightItem[] = data.flights || data.items || [];

    return items
      .filter((f) => {
        const lat = f.lat ?? f.location?.latitude;
        const lon = f.lon ?? f.location?.longitude;
        return lat != null && lon != null && lat !== 0 && lon !== 0 && !f.onGround;
      })
      .map((f) => ({
        id: f.icao24 || f.id || '',
        callsign: f.callsign || f.hexCode || 'N/A',
        lat: f.lat ?? f.location?.latitude ?? 0,
        lon: f.lon ?? f.location?.longitude ?? 0,
        altitude: f.altitude ?? 0,
        velocity: f.velocity ?? f.speed ?? 0,
        heading: f.heading ?? 0,
        origin: f.origin || f.originCountry || '',
        operator: f.operator || '',
        aircraftType: f.aircraftType || '',
      }));
  } catch (err) {
    console.warn('[flights] Failed to fetch flights:', err);
    return [];
  }
}
