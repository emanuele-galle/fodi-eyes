/**
 * Unified Analysis Service
 * Consolidates geo-convergence, country instability, cross-module integration,
 * signal aggregation, focal-point detection, hotspot escalation, infrastructure
 * cascade, parallel analysis, threat classification, cached scores/posture,
 * geo-hub index, geo-activity, temporal baseline, and analysis-core.
 *
 * Re-exports everything with original names for drop-in replacement.
 */

// ============================================================================
// RE-EXPORTS: Modules that are self-contained and NOT simplified
// These files have RPC clients, complex state, or are used by workers.
// They remain as separate files and are re-exported here for a single import path.
// ============================================================================

// --- analysis-core (used by web worker - must stay separate) ---
export {
  clusterNewsCore,
  analyzeCorrelationsCore,
  detectConvergence as detectSourceConvergence,
  detectTriangulation,
  detectPipelineFlowDrops,
  SIMILARITY_THRESHOLD,
  tokenize,
  jaccardSimilarity,
  generateSignalId,
  generateDedupeKey,
  type NewsItemCore,
  type NewsItemWithTier,
  type ClusteredEventCore,
  type PredictionMarketCore,
  type MarketDataCore,
  type SignalType as CoreSignalType,
  type CorrelationSignalCore,
  type SourceType,
  type StreamSnapshot,
} from './analysis-core';

// --- threat-classifier (used by rss, analysis-core, types re-export) ---
export {
  classifyByKeyword,
  classifyWithAI,
  aggregateThreats,
  getThreatColor,
  getThreatLabel,
  THREAT_COLORS,
  THREAT_LABELS,
  THREAT_PRIORITY,
  type ThreatClassification,
  type ThreatLevel,
  type EventCategory,
} from './threat-classifier';

// --- infrastructure-cascade (complex graph, ports, cables, pipelines) ---
export {
  buildDependencyGraph,
  calculateCascade,
  getGraphStats,
  clearGraphCache,
  getCableById,
  getPipelineById,
  getPortById,
  type DependencyGraph,
} from './infrastructure-cascade';

// --- cached-theater-posture (sebuf RPC client) ---
export {
  fetchCachedTheaterPosture,
  getCachedPosture,
  hasCachedPosture,
  type CachedTheaterPosture,
} from './cached-theater-posture';

// --- cached-risk-scores (sebuf RPC client) ---
export {
  fetchCachedRiskScores,
  getCachedScores,
  hasCachedScores,
  toCountryScore,
  type CachedCIIScore,
  type CachedStrategicRisk,
  type CachedRiskScores,
} from './cached-risk-scores';

// --- temporal-baseline (sebuf RPC client) ---
export {
  updateAndCheck,
  checkAnomaly,
  reportMetrics,
  type TemporalAnomaly,
  type TemporalEventType,
} from './temporal-baseline';

// --- parallel-analysis (ML worker integration) ---
export {
  parallelAnalysis,
  type AnalyzedHeadline,
  type AnalysisReport,
  type PerspectiveScore,
} from './parallel-analysis';

// --- signal-aggregator (stateful singleton) ---
export {
  signalAggregator,
  logSignalSummary,
  type SignalType,
  type GeoSignal,
  type CountrySignalCluster,
  type RegionalConvergence,
  type SignalSummary,
} from './signal-aggregator';

// --- focal-point-detector (stateful singleton) ---
export { focalPointDetector } from './focal-point-detector';

// --- geo-convergence ---
export {
  type GeoEventType,
  type GeoConvergenceAlert,
  getCellId,
  ingestGeoEvent,
  ingestProtests,
  ingestFlights,
  ingestVessels,
  ingestEarthquakes,
  detectGeoConvergence,
  getLocationName,
  geoConvergenceToSignal,
  detectConvergence as detectGeoConvergenceAll,
  clearCells,
  getCellCount,
  getAlertsNearLocation,
  debugInjectTestEvents,
  debugGetCells,
} from './geo-convergence';

// --- country-instability ---
export {
  type CountryScore,
  type ComponentScores,
  type CountryData,
  TIER1_COUNTRIES,
  COUNTRY_BOUNDS,
  setHasCachedScores,
  startLearning,
  isInLearningMode,
  getLearningProgress,
  clearCountryData,
  getCountryData,
  getPreviousScores,
  ingestProtestsForCII,
  ingestConflictsForCII,
  ingestUcdpForCII,
  ingestHapiForCII,
  ingestDisplacementForCII,
  ingestClimateForCII,
  ingestMilitaryForCII,
  ingestNewsForCII,
  ingestOutagesForCII,
  calculateCII,
  getTopUnstableCountries,
  getCountryScore,
} from './country-instability';

// --- cross-module-integration ---
export {
  type AlertPriority,
  type AlertType,
  type UnifiedAlert,
  type CIIChangeAlert,
  type CascadeAlert,
  type StrategicRiskOverview,
  createConvergenceAlert,
  createCIIAlert,
  createCascadeAlert,
  checkCIIChanges,
  calculateStrategicRiskOverview,
  getAlerts,
  getRecentAlerts,
  clearAlerts,
  getAlertCount,
} from './cross-module-integration';

// --- hotspot-escalation ---
export {
  type DynamicEscalationScore,
  type EscalationSignalReason,
  setCIIGetter,
  setGeoAlertGetter,
  calculateDynamicScore,
  getHotspotEscalation,
  getAllEscalationScores,
  shouldEmitSignal,
  markSignalEmitted,
  countMilitaryNearHotspot,
  setMilitaryData,
  updateHotspotEscalation,
  getEscalationChange24h,
  clearEscalationData,
} from './hotspot-escalation';

// --- geo-hub-index ---
export {
  type GeoHubLocation,
  type GeoHubMatch,
  inferGeoHubsFromTitle,
  getGeoHubById,
  getAllGeoHubs,
} from './geo-hub-index';

// --- geo-activity ---
export {
  type GeoHubActivity,
  aggregateGeoActivity,
  getTopActiveGeoHubs,
  getGeoHubActivity,
} from './geo-activity';
