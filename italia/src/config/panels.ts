import type { PanelConfig, MapLayers } from '@/types';
import type { DataSourceId } from '@/services/data-freshness';

// ============================================
// DEFAULT PANELS
// ============================================
// Panel order matters! First panels appear at top of grid.
export const DEFAULT_PANELS: Record<string, PanelConfig> = {
  map: { name: 'Mappa Italia', enabled: true, priority: 1 },
  'live-news': { name: 'Live News', enabled: true, priority: 1 },
  italia: { name: 'Italia', enabled: true, priority: 1 },
  'politics-italy': { name: 'Politica Italia', enabled: true, priority: 1 },
  gov: { name: 'Governo Italiano', enabled: true, priority: 1 },
  'italia-data': { name: 'Dati Italia', enabled: true, priority: 1 },
  economic: { name: 'Indicatori Economici IT', enabled: false, priority: 1 },
  mercati: { name: 'Mercati', enabled: true, priority: 1 },
  energy: { name: 'Energia Italia', enabled: false, priority: 1 },
  'osint-arsenal': { name: 'OSINT Arsenal', enabled: true, priority: 1 },
  'entity-search': { name: 'Entità Investigate', enabled: true, priority: 1 },
  'open-data': { name: 'Open Data Italia', enabled: true, priority: 1 },
  intel: { name: 'Intelligence OSINT', enabled: true, priority: 1 },
  'risk-overview': { name: 'Panoramica Rischio', enabled: true, priority: 1 },
  thinktanks: { name: 'Think Tank IT/EU', enabled: true, priority: 1 },
  politics: { name: 'News Europa', enabled: true, priority: 1 },
  tech: { name: 'Technology', enabled: true, priority: 2 },
  'satellite-fires': { name: 'Fires', enabled: true, priority: 2 },
  climate: { name: 'Climate Anomalies', enabled: true, priority: 2 },
  insights: { name: 'AI Insights', enabled: true, priority: 1 },
  monitors: { name: 'My Monitors', enabled: true, priority: 2 },
};

// ============================================
// MAP LAYERS
// ============================================
export const DEFAULT_MAP_LAYERS: MapLayers = {
  bases: true,
  hotspots: true,
  weather: true,
  economic: true,
  outages: true,
  cyberThreats: false,
  natural: true,
  fires: false,
  climate: false,
  italyBoundaries: true,
  webcams: true,
  flights: true,
};

// ============================================
// MOBILE MAP LAYERS
// ============================================
export const MOBILE_DEFAULT_MAP_LAYERS: MapLayers = {
  bases: false,
  hotspots: true,
  weather: true,
  economic: false,
  outages: true,
  cyberThreats: false,
  natural: true,
  fires: false,
  climate: false,
  italyBoundaries: false,
  webcams: false,
  flights: false,
};

// ============================================
// LAYER TO SOURCE MAPPING
// ============================================
/** Maps map-layer toggle keys to their data-freshness source IDs (single source of truth). */
export const LAYER_TO_SOURCE: Partial<Record<keyof MapLayers, DataSourceId[]>> = {
  natural: ['usgs'],
  weather: ['weather'],
  outages: ['outages'],
  cyberThreats: ['cyber_threats'],
  climate: ['climate'],
  flights: ['opensky'],
};

// Refresh intervals (milliseconds)
export const REFRESH_INTERVALS = {
  feeds: 5 * 60 * 1000,
  markets: 4 * 60 * 1000,
  crypto: 4 * 60 * 1000,
  predictions: 5 * 60 * 1000,
  ais: 10 * 60 * 1000,
};

// Monitor palette — fixed category colors persisted to localStorage (not theme-dependent)
export const MONITOR_COLORS = [
  '#44ff88',
  '#ff8844',
  '#4488ff',
  '#ff44ff',
  '#ffff44',
  '#ff4444',
  '#44ffff',
  '#88ff44',
  '#ff88ff',
  '#88ffff',
];

export const STORAGE_KEYS = {
  panels: 'fodi-eyes-panels',
  monitors: 'fodi-eyes-monitors',
  mapLayers: 'fodi-eyes-layers',
  disabledFeeds: 'fodi-eyes-disabled-feeds',
} as const;
