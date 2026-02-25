/**
 * Flights layer data service — FlightRadar24-style
 */

export interface FlightPoint {
  id: string;
  callsign: string;
  lat: number;
  lon: number;
  altitude: number;
  velocity: number;
  heading: number;
  verticalRate: number;
  squawk: string;
  origin: string;
  originCountry: string;
  operator: string;
  airline: string;
  aircraftType: string;
}

// Common ICAO airline codes → names (top airlines seen over Italy/Europe)
const AIRLINE_CODES: Record<string, string> = {
  RYR: 'Ryanair', EZY: 'easyJet', WZZ: 'Wizz Air', VLG: 'Vueling',
  AZA: 'ITA Airways', ENT: 'Enter Air', THY: 'Turkish Airlines',
  AFR: 'Air France', BAW: 'British Airways', DLH: 'Lufthansa',
  SWR: 'Swiss', AUA: 'Austrian', TAP: 'TAP Portugal',
  IBE: 'Iberia', KLM: 'KLM', SAS: 'SAS', FIN: 'Finnair',
  LOT: 'LOT Polish', CSA: 'Czech Airlines', BEL: 'Brussels Airlines',
  AEE: 'Aegean', ROT: 'TAROM', TVF: 'Transavia France',
  EJU: 'easyJet Europe', BER: 'Eurowings', EWG: 'Eurowings',
  UAE: 'Emirates', ETD: 'Etihad', QTR: 'Qatar Airways',
  ETH: 'Ethiopian', RAM: 'Royal Air Maroc', MSR: 'EgyptAir',
  UPS: 'UPS', FDX: 'FedEx', GTI: 'Atlas Air',
  AAL: 'American Airlines', DAL: 'Delta', UAL: 'United',
  VOE: 'Volotea', NOS: 'Neos', NAX: 'Norwegian',
  TRA: 'Transavia', EZS: 'easyJet Switzerland',
  AHY: 'Azerbaijan Airlines', PGT: 'Pegasus', SXS: 'SunExpress',
  CLX: 'Cargolux', MPH: 'Martinair', NOZ: 'Norwegian Air Shuttle',
  TVS: 'Travel Service', LZB: 'Luxair', AMC: 'Air Malta',
  DAH: 'Air Algerie', THA: 'Thai Airways', SIA: 'Singapore Airlines',
  CPA: 'Cathay Pacific', ANA: 'ANA', JAL: 'Japan Airlines',
  ACA: 'Air Canada', MEA: 'Middle East Airlines',
  // Military
  RCH: 'USAF (AMC)', RRR: 'RAF', GAF: 'German Air Force',
  IAM: 'Italian Air Force', FAF: 'French Air Force',
  CNV: 'US Navy', NAVY: 'US Navy',
};

function getAirlineName(callsign: string): string {
  if (!callsign || callsign.length < 3) return '';
  const prefix = callsign.substring(0, 3).toUpperCase();
  return AIRLINE_CODES[prefix] || '';
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
  verticalRate?: number;
  squawk?: string | null;
  origin?: string;
  originCountry?: string;
  operator?: string;
  aircraftType?: string;
  onGround?: boolean;
}

export async function fetchFlightsForMap(bbox?: { south: number; west: number; north: number; east: number }): Promise<FlightPoint[]> {
  try {
    const body = bbox
      ? { boundingBox: { southWest: { latitude: bbox.south, longitude: bbox.west }, northEast: { latitude: bbox.north, longitude: bbox.east } } }
      : { boundingBox: { southWest: { latitude: 35.5, longitude: 6.5 }, northEast: { latitude: 47.5, longitude: 19.0 } } };

    const resp = await fetch('/api/military/v1/list-military-flights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) return [];
    const data = await resp.json();

    const items: RawFlightItem[] = data.flights || data.items || [];

    return items
      .filter((f) => {
        const lat = f.lat ?? f.location?.latitude;
        const lon = f.lon ?? f.location?.longitude;
        return lat != null && lon != null && lat !== 0 && lon !== 0 && !f.onGround;
      })
      .map((f) => {
        const callsign = f.callsign || f.hexCode || 'N/A';
        return {
          id: f.icao24 || f.id || '',
          callsign,
          lat: f.lat ?? f.location?.latitude ?? 0,
          lon: f.lon ?? f.location?.longitude ?? 0,
          altitude: f.altitude ?? 0,
          velocity: f.velocity ?? f.speed ?? 0,
          heading: f.heading ?? 0,
          verticalRate: f.verticalRate ?? 0,
          squawk: f.squawk || '',
          origin: f.origin || '',
          originCountry: f.originCountry || '',
          operator: f.operator || '',
          airline: getAirlineName(callsign),
          aircraftType: f.aircraftType || '',
        };
      });
  } catch (err) {
    console.warn('[flights] Failed to fetch flights:', err);
    return [];
  }
}

/** Fetch global flights for a given bounding box (used by mondo) */
export async function fetchGlobalFlights(bbox: { south: number; west: number; north: number; east: number }): Promise<FlightPoint[]> {
  try {
    const resp = await fetch('/api/flights/global', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boundingBox: {
          southWest: { latitude: bbox.south, longitude: bbox.west },
          northEast: { latitude: bbox.north, longitude: bbox.east },
        },
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!resp.ok) return [];
    const data = await resp.json();
    const items: RawFlightItem[] = data.items || [];

    return items
      .filter((f) => f.lat != null && f.lon != null)
      .map((f) => {
        const callsign = f.callsign || '';
        return {
          id: f.icao24 || '',
          callsign,
          lat: f.lat!,
          lon: f.lon!,
          altitude: f.altitude ?? 0,
          velocity: f.velocity ?? 0,
          heading: f.heading ?? 0,
          verticalRate: f.verticalRate ?? 0,
          squawk: f.squawk || '',
          origin: '',
          originCountry: f.originCountry || '',
          operator: '',
          airline: getAirlineName(callsign),
          aircraftType: '',
        };
      });
  } catch (err) {
    console.warn('[flights] Failed to fetch global flights:', err);
    return [];
  }
}
