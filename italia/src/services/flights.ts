/**
 * Flights layer data service.
 * Fetches military/tracked flights from the local API and exposes a simple
 * array of FlightPoint objects for the map layer.
 */

import {
  MilitaryServiceClient,
  type MilitaryFlight,
} from '@/generated/client/worldmonitor/military/v1/service_client';

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

// Italy bounding box (generous)
const ITALY_BBOX = {
  southWest: { latitude: 35.5, longitude: 6.5 },
  northEast: { latitude: 47.5, longitude: 19.0 },
};

const client = new MilitaryServiceClient(window.location.origin);

export async function fetchFlightsForMap(): Promise<FlightPoint[]> {
  try {
    const resp = await client.listMilitaryFlights(
      {
        boundingBox: ITALY_BBOX,
        operator: 'MILITARY_OPERATOR_UNSPECIFIED',
        aircraftType: 'MILITARY_AIRCRAFT_TYPE_UNSPECIFIED',
      },
      { signal: AbortSignal.timeout(15_000) },
    );

    return (resp.flights || [])
      .filter((f: MilitaryFlight) => f.location && f.location.latitude !== 0 && f.location.longitude !== 0)
      .map((f: MilitaryFlight) => ({
        id: f.id,
        callsign: f.callsign || f.hexCode || 'N/A',
        lat: f.location!.latitude,
        lon: f.location!.longitude,
        altitude: f.altitude,
        velocity: f.speed,
        heading: f.heading,
        origin: f.origin || '',
        operator: f.operator || '',
        aircraftType: f.aircraftType || '',
      }));
  } catch (err) {
    console.warn('[flights] Failed to fetch flights:', err);
    return [];
  }
}
