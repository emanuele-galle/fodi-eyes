/**
 * onData Italian boundaries service
 * Fetches GeoJSON administrative boundaries from onData GitHub repo
 * Source: https://github.com/ondata/confini-amministrativi-istat
 */

export interface ItalyRegionProperties {
  reg_name: string;
  reg_istat_code: string;
  reg_istat_code_num: number;
}

// Cached GeoJSON data
let regionsGeoJson: GeoJSON.FeatureCollection | null = null;
let fetchPromise: Promise<GeoJSON.FeatureCollection | null> | null = null;

const REGIONS_URL = 'https://raw.githubusercontent.com/ondata/confini-amministrativi-istat/main/geojson/regioni.geojson';

// Italian regions color palette (20 regions)
export const REGION_COLORS: Record<string, [number, number, number, number]> = {
  'Piemonte': [66, 133, 244, 60],
  'Valle d\'Aosta': [52, 168, 83, 60],
  'Lombardia': [234, 67, 53, 60],
  'Trentino-Alto Adige': [251, 188, 4, 60],
  'Veneto': [103, 58, 183, 60],
  'Friuli-Venezia Giulia': [0, 188, 212, 60],
  'Liguria': [255, 87, 34, 60],
  'Emilia-Romagna': [76, 175, 80, 60],
  'Toscana': [121, 85, 72, 60],
  'Umbria': [233, 30, 99, 60],
  'Marche': [63, 81, 181, 60],
  'Lazio': [255, 152, 0, 60],
  'Abruzzo': [0, 150, 136, 60],
  'Molise': [156, 39, 176, 60],
  'Campania': [244, 67, 54, 60],
  'Puglia': [33, 150, 243, 60],
  'Basilicata': [139, 195, 74, 60],
  'Calabria': [255, 193, 7, 60],
  'Sicilia': [96, 125, 139, 60],
  'Sardegna': [0, 121, 107, 60],
};

export async function fetchItalyRegions(): Promise<GeoJSON.FeatureCollection | null> {
  if (regionsGeoJson) return regionsGeoJson;
  if (fetchPromise) return fetchPromise;

  fetchPromise = (async () => {
    try {
      const response = await fetch(REGIONS_URL);
      if (!response.ok) return null;
      const data = await response.json() as GeoJSON.FeatureCollection;
      regionsGeoJson = data;
      return data;
    } catch {
      return null;
    } finally {
      fetchPromise = null;
    }
  })();

  return fetchPromise;
}

export function getRegionColor(name: string): [number, number, number, number] {
  return REGION_COLORS[name] || [128, 128, 128, 40];
}
