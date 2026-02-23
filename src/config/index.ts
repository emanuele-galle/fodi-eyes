// Configuration exports — Fodi-eyes OSINT Italia

// SITE_VARIANT hardcoded to 'full' (tech/finance variants removed)
export const SITE_VARIANT = 'full';

// Shared base configuration
export {
  REFRESH_INTERVALS,
  MONITOR_COLORS,
  STORAGE_KEYS,
} from './panels';

// Market data
export { SECTORS, COMMODITIES, MARKET_SYMBOLS, CRYPTO_MAP } from './markets';

// Geo data
export { UNDERSEA_CABLES, MAP_URLS } from './geo';


// Feeds configuration
export {
  SOURCE_TIERS,
  getSourceTier,
  SOURCE_TYPES,
  getSourceType,
  getSourcePropagandaRisk,
  ALERT_KEYWORDS,
  ALERT_EXCLUSIONS,
  type SourceRiskProfile,
  type SourceType,
} from './feeds';

// Panel configuration
export {
  DEFAULT_PANELS,
  DEFAULT_MAP_LAYERS,
  MOBILE_DEFAULT_MAP_LAYERS,
  LAYER_TO_SOURCE,
} from './panels';

// Feeds & Intel sources
export {
  FEEDS,
  INTEL_SOURCES,
} from './feeds';

// Geo exports
export {
  INTEL_HOTSPOTS,
  MILITARY_BASES,
  APT_GROUPS,
  STRATEGIC_WATERWAYS,
  ECONOMIC_CENTERS,
  SANCTIONED_COUNTRIES,
} from './geo';

// AI Regulations
export { AI_REGULATIONS, COUNTRY_REGULATION_PROFILES, getRegulationById, getRegulationsByCountry, getUpcomingDeadlines, getRecentActions } from './ai-regulations';

// Infrastructure data (kept for reference/future use)
export { PIPELINES, PIPELINE_COLORS } from './pipelines';
export { PORTS } from './ports';
export { MONITORED_AIRPORTS, FAA_AIRPORTS } from './airports';
export {
  ENTITY_REGISTRY,
  getEntityById,
  type EntityType,
  type EntityEntry,
} from './entities';
