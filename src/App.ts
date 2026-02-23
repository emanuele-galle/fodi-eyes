import type { NewsItem, Monitor, PanelConfig, MapLayers, RelatedAsset, InternetOutage, SocialUnrestEvent, CyberThreat } from '@/types';
import {
  FEEDS,
  INTEL_SOURCES,
  MARKET_SYMBOLS,
  REFRESH_INTERVALS,
  DEFAULT_PANELS,
  DEFAULT_MAP_LAYERS,
  MOBILE_DEFAULT_MAP_LAYERS,
  STORAGE_KEYS,
  LAYER_TO_SOURCE,
} from '@/config';
import { BETA_MODE } from '@/config/beta';
import { fetchCategoryFeeds, getFeedFailures, fetchMultipleStocks, fetchEarthquakes, fetchWeatherAlerts, fetchFredData, fetchInternetOutages, isOutagesConfigured, initDB, updateBaseline, calculateDeviation, saveSnapshot, cleanOldSnapshots, analysisWorker, fetchPizzIntStatus, fetchGdeltTensions, fetchNaturalEvents, fetchOilAnalytics, fetchCyberThreats } from '@/services';
import { mlWorker } from '@/services/ml-worker';
import { clusterNewsHybrid } from '@/services/clustering';
import { ingestEarthquakes } from '@/services/geo-convergence';
import { signalAggregator } from '@/services/signal-aggregator';
import { updateAndCheck } from '@/services/temporal-baseline';
import { fetchAllFires, flattenFires, computeRegionStats, toMapFires } from '@/services/wildfires';
import { SatelliteFiresPanel } from '@/components/SatelliteFiresPanel';
import { ingestOutagesForCII, ingestClimateForCII, startLearning, calculateCII, getCountryData, TIER1_COUNTRIES } from '@/services/country-instability';
import { dataFreshness, type DataSourceId } from '@/services/data-freshness';
import { fetchItalyRegions } from '@/services/ondata';
import { fetchClimateAnomalies } from '@/services/climate';
import { buildMapUrl, debounce, loadFromStorage, parseMapUrlState, saveToStorage, ExportPanel, getCircuitBreakerCooldownInfo, isMobileDevice, setTheme, getCurrentTheme } from '@/utils';
// CountryBriefPage and CountryTimeline removed — map-centered layout
import { escapeHtml } from '@/utils/sanitize';
import type { ParsedMapUrlState } from '@/utils';
import {
  MapContainer,
  type TimeRange,
  NewsPanel,
  MarketPanel,
  MonitorPanel,
  Panel,
  SignalModal,
  PlaybackControl,
  StatusPanel,
  EconomicPanel,
  SearchModal,
  MobileWarningModal,
  PizzIntIndicator,
  LiveNewsPanel,
  Sidebar,
  TerritorialWebcamsPanel,
  IntelligenceGapBadge,
  ServiceStatusPanel,
  RuntimeConfigPanel,
  InsightsPanel,
  ClimateAnomalyPanel,
  LanguageSelector,
  OsintArsenalPanel,
  ItaliaDataPanel,
  PoliticsItalyPanel,
  OpenDataPanel,
  EntitySearchPanel,
} from '@/components';
import type { SearchResult } from '@/components/SearchModal';
import { collectStoryData } from '@/services/story-data';
import { openStoryModal } from '@/components/StoryModal';
import { INTEL_HOTSPOTS, MILITARY_BASES, UNDERSEA_CABLES } from '@/config/geo';
import { isDesktopRuntime } from '@/services/runtime';
import { isFeatureAvailable } from '@/services/runtime-config';
import { trackEvent, trackThemeChanged, trackMapLayerToggle, trackCountrySelected, trackSearchResultSelected, trackPanelToggled, trackUpdateShown, trackUpdateClicked, trackUpdateDismissed, trackDeeplinkOpened } from '@/services/analytics';
import { invokeTauri } from '@/services/tauri-bridge';
import { hasCountryGeometry, isCoordinateInCountry, preloadCountryGeometry } from '@/services/country-geometry';
import { initI18n, t, changeLanguage } from '@/services/i18n';

import type { MarketData, ClusteredEvent } from '@/types';
import type { PredictionMarket } from '@/services/prediction';

type IntlDisplayNamesCtor = new (
  locales: string | string[],
  options: { type: 'region' }
) => { of: (code: string) => string | undefined };

interface DesktopRuntimeInfo {
  os: string;
  arch: string;
}

type UpdaterOutcome = 'no_update' | 'update_available' | 'open_failed' | 'fetch_failed';
const CYBER_LAYER_ENABLED = import.meta.env.VITE_ENABLE_CYBER_LAYER === 'true';

export interface CountryBriefSignals {
  protests: number;
  outages: number;
  earthquakes: number;
  displacementOutflow: number;
  climateStress: number;
  conflictEvents: number;
  militaryFlights: number;
  militaryVessels: number;
  isTier1: boolean;
}

export class App {
  private container: HTMLElement;
  private readonly PANEL_ORDER_KEY = 'panel-order';
  private readonly PANEL_SPANS_KEY = 'fodi-eyes-panel-spans';
  private map: MapContainer | null = null;
  private panels: Record<string, Panel> = {};
  private newsPanels: Record<string, NewsPanel> = {};
  private allNews: NewsItem[] = [];
  private newsByCategory: Record<string, NewsItem[]> = {};
  private currentTimeRange: TimeRange = '7d';
  private monitors: Monitor[];
  private panelSettings: Record<string, PanelConfig>;
  private mapLayers: MapLayers;
  private signalModal: SignalModal | null = null;
  private playbackControl: PlaybackControl | null = null;
  private statusPanel: StatusPanel | null = null;
  private exportPanel: ExportPanel | null = null;
  private languageSelector: LanguageSelector | null = null;
  private searchModal: SearchModal | null = null;
  private mobileWarningModal: MobileWarningModal | null = null;
  private pizzintIndicator: PizzIntIndicator | null = null;
  private latestPredictions: PredictionMarket[] = [];
  private latestMarkets: MarketData[] = [];
  private latestClusters: ClusteredEvent[] = [];
  private readonly applyTimeRangeFilterToNewsPanelsDebounced = debounce(() => {
    this.applyTimeRangeFilterToNewsPanels();
  }, 120);
  private isPlaybackMode = false;
  private initialUrlState: ParsedMapUrlState | null = null;
  private inFlight: Set<string> = new Set();
  private isMobile: boolean;
  private snapshotIntervalId: ReturnType<typeof setInterval> | null = null;
  private refreshTimeoutIds: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private isDestroyed = false;
  private boundKeydownHandler: ((e: KeyboardEvent) => void) | null = null;
  private boundFullscreenHandler: (() => void) | null = null;
  private boundResizeHandler: (() => void) | null = null;
  private boundVisibilityHandler: (() => void) | null = null;
  private idleTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private boundIdleResetHandler: (() => void) | null = null;
  private isIdle = false;
  private readonly IDLE_PAUSE_MS = 2 * 60 * 1000; // 2 minutes - pause animations when idle
  private disabledSources: Set<string> = new Set();
  private mapFlashCache: Map<string, number> = new Map();
  private readonly MAP_FLASH_COOLDOWN_MS = 10 * 60 * 1000;
  private initialLoadComplete = false;
  // countryBriefPage and countryTimeline removed — map-centered layout
  private findingsBadge: IntelligenceGapBadge | null = null;
  private pendingDeepLinkCountry: string | null = null;
  private readonly isDesktopApp = isDesktopRuntime();
  private readonly UPDATE_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000; // 6 hours
  private updateCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  private clockIntervalId: ReturnType<typeof setInterval> | null = null;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container ${containerId} not found`);
    this.container = el;

    this.isMobile = isMobileDevice();
    this.monitors = loadFromStorage<Monitor[]>(STORAGE_KEYS.monitors, []);

    // Use mobile-specific defaults on first load (no saved layers)
    const defaultLayers = this.isMobile ? MOBILE_DEFAULT_MAP_LAYERS : DEFAULT_MAP_LAYERS;

    this.mapLayers = loadFromStorage<MapLayers>(STORAGE_KEYS.mapLayers, defaultLayers);
    this.panelSettings = loadFromStorage<Record<string, PanelConfig>>(
      STORAGE_KEYS.panels,
      DEFAULT_PANELS
    );
    console.log('[App] Loaded panel settings from storage:', Object.entries(this.panelSettings).filter(([_, v]) => !v.enabled).map(([k]) => k));

    // One-time migration: clear stale panel ordering and sizing state that can
    // leave non-draggable gaps in mixed-size layouts on wide screens.
    const LAYOUT_RESET_MIGRATION_KEY = 'fodi-eyes-layout-reset-v2.5';
    if (!localStorage.getItem(LAYOUT_RESET_MIGRATION_KEY)) {
      const hadSavedOrder = !!localStorage.getItem(this.PANEL_ORDER_KEY);
      const hadSavedSpans = !!localStorage.getItem(this.PANEL_SPANS_KEY);
      if (hadSavedOrder || hadSavedSpans) {
        localStorage.removeItem(this.PANEL_ORDER_KEY);
        localStorage.removeItem(this.PANEL_SPANS_KEY);
        console.log('[App] Applied layout reset migration (v2.5): cleared panel order/spans');
      }
      localStorage.setItem(LAYOUT_RESET_MIGRATION_KEY, 'done');
    }

    // Desktop key management panel must always remain accessible in Tauri.
    if (this.isDesktopApp) {
      const runtimePanel = this.panelSettings['runtime-config'] ?? {
        name: 'Desktop Configuration',
        enabled: true,
        priority: 2,
      };
      runtimePanel.enabled = true;
      this.panelSettings['runtime-config'] = runtimePanel;
      saveToStorage(STORAGE_KEYS.panels, this.panelSettings);
    }

    this.initialUrlState = parseMapUrlState(window.location.search, this.mapLayers);
    if (this.initialUrlState.layers) {
      this.mapLayers = this.initialUrlState.layers;
    }
    if (!CYBER_LAYER_ENABLED) {
      this.mapLayers.cyberThreats = false;
    }
    this.disabledSources = new Set(loadFromStorage<string[]>(STORAGE_KEYS.disabledFeeds, []));
  }

  public async init(): Promise<void> {
    const initStart = performance.now();
    await initDB();
    await initI18n();

    // Initialize ML worker (desktop only - automatically disabled on mobile)
    await mlWorker.init();

    this.renderLayout();
    this.startHeaderClock();
    this.signalModal = new SignalModal();
    this.signalModal.setLocationClickHandler((lat, lon) => {
      this.map?.setCenter(lat, lon, 4);
    });
    if (!this.isMobile) {
      this.findingsBadge = new IntelligenceGapBadge();
      this.findingsBadge.setOnSignalClick((signal) => {
        if (localStorage.getItem('wm-settings-open') === '1') return;
        this.signalModal?.showSignal(signal);
      });
      this.findingsBadge.setOnAlertClick((alert) => {
        if (localStorage.getItem('wm-settings-open') === '1') return;
        this.signalModal?.showAlert(alert);
      });
    }
    this.setupMobileWarning();
    this.setupPlaybackControl();
    this.setupStatusPanel();
    this.setupPizzIntIndicator();
    this.setupExportPanel();
    this.setupLanguageSelector();
    this.setupSearchModal();
    this.setupMapLayerHandlers();
    this.setupCountryIntel();
    this.setupEventListeners();
    // Capture ?country= BEFORE URL sync overwrites it
    const initState = parseMapUrlState(window.location.search, this.mapLayers);
    this.pendingDeepLinkCountry = initState.country ?? null;
    this.setupUrlStateSync();
    this.syncDataFreshnessWithLayers();
    await preloadCountryGeometry();
    await this.loadAllData();

    // Start CII learning mode after first data load
    startLearning();

    // Hide unconfigured layers after first data load
    if (isOutagesConfigured() === false) {
      this.map?.hideLayerToggle('outages');
    }
    if (!CYBER_LAYER_ENABLED) {
      this.map?.hideLayerToggle('cyberThreats');
    }

    this.setupRefreshIntervals();
    this.setupSnapshotSaving();
    cleanOldSnapshots().catch((e) => console.warn('[Storage] Snapshot cleanup failed:', e));

    // Handle deep links for story sharing
    this.handleDeepLinks();

    this.setupUpdateChecks();

    // Track app load timing and panel count
    trackEvent('wm_app_loaded', {
      load_time_ms: Math.round(performance.now() - initStart),
      panel_count: Object.keys(this.panels).length,
    });

    // Observe panel visibility for usage analytics
    this.setupPanelViewTracking();
  }

  private handleDeepLinks(): void {
    const url = new URL(window.location.href);
    const MAX_DEEP_LINK_RETRIES = 60;
    const DEEP_LINK_RETRY_INTERVAL_MS = 500;
    const DEEP_LINK_INITIAL_DELAY_MS = 2000;

    // Check for story deep link: /story?c=UA&t=ciianalysis
    if (url.pathname === '/story' || url.searchParams.has('c')) {
      const countryCode = url.searchParams.get('c');
      if (countryCode) {
        trackDeeplinkOpened('story', countryCode);
        const countryNames: Record<string, string> = {
          UA: 'Ukraine', RU: 'Russia', CN: 'China', US: 'United States',
          IR: 'Iran', IL: 'Israel', TW: 'Taiwan', KP: 'North Korea',
          SA: 'Saudi Arabia', TR: 'Turkey', PL: 'Poland', DE: 'Germany',
          FR: 'France', GB: 'United Kingdom', IN: 'India', PK: 'Pakistan',
          SY: 'Syria', YE: 'Yemen', MM: 'Myanmar', VE: 'Venezuela',
        };
        const countryName = countryNames[countryCode.toUpperCase()] || countryCode;

        // Wait for data to load, then open story
        let attempts = 0;
        const checkAndOpen = () => {
          if (dataFreshness.hasSufficientData() && this.latestClusters.length > 0) {
            this.openCountryStory(countryCode.toUpperCase(), countryName);
            return;
          }
          attempts += 1;
          if (attempts >= MAX_DEEP_LINK_RETRIES) {
            this.showToast('Data not available');
            return;
          } else {
            setTimeout(checkAndOpen, DEEP_LINK_RETRY_INTERVAL_MS);
          }
        };
        setTimeout(checkAndOpen, DEEP_LINK_INITIAL_DELAY_MS);

        // Update URL without reload
        history.replaceState(null, '', '/');
        return;
      }
    }

    // Check for country brief deep link: ?country=UA (captured before URL sync)
    const deepLinkCountry = this.pendingDeepLinkCountry;
    this.pendingDeepLinkCountry = null;
    if (deepLinkCountry) {
      trackDeeplinkOpened('country', deepLinkCountry);
      const cName = App.resolveCountryName(deepLinkCountry);
      let attempts = 0;
      const checkAndOpenBrief = () => {
        if (dataFreshness.hasSufficientData()) {
          this.openCountryBriefByCode(deepLinkCountry, cName);
          return;
        }
        attempts += 1;
        if (attempts >= MAX_DEEP_LINK_RETRIES) {
          this.showToast('Data not available');
          return;
        } else {
          setTimeout(checkAndOpenBrief, DEEP_LINK_RETRY_INTERVAL_MS);
        }
      };
      setTimeout(checkAndOpenBrief, DEEP_LINK_INITIAL_DELAY_MS);
    }
  }

  private setupPanelViewTracking(): void {
    // panelsGrid removed — sidebar layout
    return;
  }

  private setupUpdateChecks(): void {
    if (!this.isDesktopApp || this.isDestroyed) return;

    // Run once shortly after startup, then poll every 6 hours.
    setTimeout(() => {
      if (this.isDestroyed) return;
      void this.checkForUpdate();
    }, 5000);

    if (this.updateCheckIntervalId) {
      clearInterval(this.updateCheckIntervalId);
    }
    this.updateCheckIntervalId = setInterval(() => {
      if (this.isDestroyed) return;
      void this.checkForUpdate();
    }, this.UPDATE_CHECK_INTERVAL_MS);
  }

  private logUpdaterOutcome(outcome: UpdaterOutcome, context: Record<string, unknown> = {}): void {
    const logger = outcome === 'open_failed' || outcome === 'fetch_failed'
      ? console.warn
      : console.info;
    logger('[updater]', outcome, context);
  }

  private async checkForUpdate(): Promise<void> {
    try {
      const res = await fetch('#'); // version check disabled
      if (!res.ok) {
        this.logUpdaterOutcome('fetch_failed', { status: res.status });
        return;
      }
      const data = await res.json();
      const remote = data.version as string;
      if (!remote) {
        this.logUpdaterOutcome('fetch_failed', { reason: 'missing_remote_version' });
        return;
      }

      const current = __APP_VERSION__;
      if (!this.isNewerVersion(remote, current)) {
        this.logUpdaterOutcome('no_update', { current, remote });
        return;
      }

      const dismissKey = `wm-update-dismissed-${remote}`;
      if (localStorage.getItem(dismissKey)) {
        this.logUpdaterOutcome('update_available', { current, remote, dismissed: true });
        return;
      }

      const releaseUrl = typeof data.url === 'string' && data.url
        ? data.url
        : '#';
      this.logUpdaterOutcome('update_available', { current, remote, dismissed: false });
      trackUpdateShown(current, remote);
      await this.showUpdateBadge(remote, releaseUrl);
    } catch (error) {
      this.logUpdaterOutcome('fetch_failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private isNewerVersion(remote: string, current: string): boolean {
    const r = remote.split('.').map(Number);
    const c = current.split('.').map(Number);
    for (let i = 0; i < Math.max(r.length, c.length); i++) {
      const rv = r[i] ?? 0;
      const cv = c[i] ?? 0;
      if (rv > cv) return true;
      if (rv < cv) return false;
    }
    return false;
  }

  private mapDesktopDownloadPlatform(os: string, arch: string): string | null {
    const normalizedOs = os.toLowerCase();
    const normalizedArch = arch.toLowerCase()
      .replace('amd64', 'x86_64')
      .replace('x64', 'x86_64')
      .replace('arm64', 'aarch64');

    if (normalizedOs === 'windows') {
      return normalizedArch === 'x86_64' ? 'windows-exe' : null;
    }

    if (normalizedOs === 'macos' || normalizedOs === 'darwin') {
      if (normalizedArch === 'aarch64') return 'macos-arm64';
      if (normalizedArch === 'x86_64') return 'macos-x64';
      return null;
    }

    return null;
  }

  private async resolveUpdateDownloadUrl(releaseUrl: string): Promise<string> {
    try {
      const runtimeInfo = await invokeTauri<DesktopRuntimeInfo>('get_desktop_runtime_info');
      const platform = this.mapDesktopDownloadPlatform(runtimeInfo.os, runtimeInfo.arch);
      if (platform) {
        return `https://fodi-eyes.fodivps2.cloud/api/download?platform=${platform}&variant=full`;
      }
    } catch {
      // Silent fallback to release page when desktop runtime info is unavailable.
    }
    return releaseUrl;
  }

  private async showUpdateBadge(version: string, releaseUrl: string): Promise<void> {
    const versionSpan = this.container.querySelector('.version');
    if (!versionSpan) return;
    const existingBadge = this.container.querySelector<HTMLElement>('.update-badge');
    if (existingBadge?.dataset.version === version) return;
    existingBadge?.remove();

    const url = await this.resolveUpdateDownloadUrl(releaseUrl);

    const badge = document.createElement('a');
    badge.className = 'update-badge';
    badge.dataset.version = version;
    badge.href = url;
    badge.target = this.isDesktopApp ? '_self' : '_blank';
    badge.rel = 'noopener';
    badge.textContent = `UPDATE v${version}`;
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      trackUpdateClicked(version);
      if (this.isDesktopApp) {
        void invokeTauri<void>('open_url', { url }).catch((error) => {
          this.logUpdaterOutcome('open_failed', {
            url,
            error: error instanceof Error ? error.message : String(error),
          });
          window.open(url, '_blank', 'noopener');
        });
        return;
      }
      window.open(url, '_blank', 'noopener');
    });

    const dismiss = document.createElement('span');
    dismiss.className = 'update-badge-dismiss';
    dismiss.textContent = '\u00d7';
    dismiss.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      trackUpdateDismissed(version);
      localStorage.setItem(`wm-update-dismissed-${version}`, '1');
      badge.remove();
    });

    badge.appendChild(dismiss);
    versionSpan.insertAdjacentElement('afterend', badge);
  }

  private startHeaderClock(): void {
    const el = document.getElementById('headerClock');
    if (!el) return;
    const tick = () => {
      el.textContent = new Date().toUTCString().replace('GMT', 'UTC');
    };
    tick();
    this.clockIntervalId = setInterval(tick, 1000);
  }

  private setupMobileWarning(): void {
    if (MobileWarningModal.shouldShow()) {
      this.mobileWarningModal = new MobileWarningModal();
      this.mobileWarningModal.show();
    }
  }

  private setupStatusPanel(): void {
    this.statusPanel = new StatusPanel();
    const headerLeft = this.container.querySelector('.header-left');
    if (headerLeft) {
      headerLeft.appendChild(this.statusPanel.getElement());
    }
  }

  private setupPizzIntIndicator(): void {
    this.pizzintIndicator = new PizzIntIndicator();
    const headerLeft = this.container.querySelector('.header-left');
    if (headerLeft) {
      headerLeft.appendChild(this.pizzintIndicator.getElement());
    }
  }

  private async loadPizzInt(): Promise<void> {
    try {
      const [status, tensions] = await Promise.all([
        fetchPizzIntStatus(),
        fetchGdeltTensions()
      ]);

      // Hide indicator if no valid data (API returned default/empty)
      if (status.locationsMonitored === 0) {
        this.pizzintIndicator?.hide();
        this.statusPanel?.updateApi('PizzINT', { status: 'error' });
        dataFreshness.recordError('pizzint', 'No monitored locations returned');
        return;
      }

      this.pizzintIndicator?.show();
      this.pizzintIndicator?.updateStatus(status);
      this.pizzintIndicator?.updateTensions(tensions);
      this.statusPanel?.updateApi('PizzINT', { status: 'ok' });
      dataFreshness.recordUpdate('pizzint', Math.max(status.locationsMonitored, tensions.length));
    } catch (error) {
      console.error('[App] PizzINT load failed:', error);
      this.pizzintIndicator?.hide();
      this.statusPanel?.updateApi('PizzINT', { status: 'error' });
      dataFreshness.recordError('pizzint', String(error));
    }
  }

  private setupExportPanel(): void {
    this.exportPanel = new ExportPanel(() => ({
      news: this.latestClusters.length > 0 ? this.latestClusters : this.allNews,
      markets: this.latestMarkets,
      predictions: this.latestPredictions,
      timestamp: Date.now(),
    }));

    const headerRight = this.container.querySelector('.header-right');
    if (headerRight) {
      headerRight.insertBefore(this.exportPanel.getElement(), headerRight.firstChild);
    }
  }

  private setupLanguageSelector(): void {
    this.languageSelector = new LanguageSelector();
    const headerRight = this.container.querySelector('.header-right');
    const searchBtn = this.container.querySelector('#searchBtn');

    if (headerRight && searchBtn) {
      // Insert before search button or at the beginning if search button not found
      headerRight.insertBefore(this.languageSelector.getElement(), searchBtn);
    } else if (headerRight) {
      headerRight.insertBefore(this.languageSelector.getElement(), headerRight.firstChild);
    }
  }

  private syncDataFreshnessWithLayers(): void {
    for (const [layer, sourceIds] of Object.entries(LAYER_TO_SOURCE)) {
      const enabled = this.mapLayers[layer as keyof MapLayers] ?? false;
      for (const sourceId of sourceIds) {
        dataFreshness.setEnabled(sourceId as DataSourceId, enabled);
      }
    }

    // Mark sources as disabled if not configured
    if (isOutagesConfigured() === false) {
      dataFreshness.setEnabled('outages', false);
    }
  }

  private setupMapLayerHandlers(): void {
    this.map?.setOnLayerChange((layer, enabled, source) => {
      console.log(`[App.onLayerChange] ${layer}: ${enabled} (${source})`);
      trackMapLayerToggle(layer, enabled, source);
      // Save layer settings
      this.mapLayers[layer] = enabled;
      saveToStorage(STORAGE_KEYS.mapLayers, this.mapLayers);

      // Sync data freshness tracker
      const sourceIds = LAYER_TO_SOURCE[layer];
      if (sourceIds) {
        for (const sourceId of sourceIds) {
          dataFreshness.setEnabled(sourceId, enabled);
        }
      }

      // Load data when layer is enabled (if not already loaded)
      if (enabled) {
        this.loadDataForLayer(layer);
      }
    });
  }

  private setupCountryIntel(): void {
    // CountryBriefPage removed — map-centered layout
    return;
  }

  public async openCountryBrief(_lat: number, _lon: number): Promise<void> {
    // CountryBriefPage removed — map-centered layout
    return;
  }

  public async openCountryBriefByCode(_code: string, _country: string): Promise<void> {
    // CountryBriefPage removed — map-centered layout
    return;
  }

  private static COUNTRY_BOUNDS: Record<string, { n: number; s: number; e: number; w: number }> = {
    IR: { n: 40, s: 25, e: 63, w: 44 }, IL: { n: 33.3, s: 29.5, e: 35.9, w: 34.3 },
    SA: { n: 32, s: 16, e: 55, w: 35 }, AE: { n: 26.1, s: 22.6, e: 56.4, w: 51.6 },
    IQ: { n: 37.4, s: 29.1, e: 48.6, w: 38.8 }, SY: { n: 37.3, s: 32.3, e: 42.4, w: 35.7 },
    YE: { n: 19, s: 12, e: 54.5, w: 42 }, LB: { n: 34.7, s: 33.1, e: 36.6, w: 35.1 },
    CN: { n: 53.6, s: 18.2, e: 134.8, w: 73.5 }, TW: { n: 25.3, s: 21.9, e: 122, w: 120 },
    JP: { n: 45.5, s: 24.2, e: 153.9, w: 122.9 }, KR: { n: 38.6, s: 33.1, e: 131.9, w: 124.6 },
    KP: { n: 43.0, s: 37.7, e: 130.7, w: 124.2 }, IN: { n: 35.5, s: 6.7, e: 97.4, w: 68.2 },
    PK: { n: 37, s: 24, e: 77, w: 61 }, AF: { n: 38.5, s: 29.4, e: 74.9, w: 60.5 },
    UA: { n: 52.4, s: 44.4, e: 40.2, w: 22.1 }, RU: { n: 82, s: 41.2, e: 180, w: 19.6 },
    BY: { n: 56.2, s: 51.3, e: 32.8, w: 23.2 }, PL: { n: 54.8, s: 49, e: 24.1, w: 14.1 },
    EG: { n: 31.7, s: 22, e: 36.9, w: 25 }, LY: { n: 33, s: 19.5, e: 25, w: 9.4 },
    SD: { n: 22, s: 8.7, e: 38.6, w: 21.8 }, US: { n: 49, s: 24.5, e: -66.9, w: -125 },
    GB: { n: 58.7, s: 49.9, e: 1.8, w: -8.2 }, DE: { n: 55.1, s: 47.3, e: 15.0, w: 5.9 },
    FR: { n: 51.1, s: 41.3, e: 9.6, w: -5.1 }, TR: { n: 42.1, s: 36, e: 44.8, w: 26 },
    BR: { n: 5.3, s: -33.8, e: -34.8, w: -73.9 },
  };

  private static resolveCountryName(code: string): string {
    if (TIER1_COUNTRIES[code]) return TIER1_COUNTRIES[code];

    try {
      const displayNamesCtor = (Intl as unknown as { DisplayNames?: IntlDisplayNamesCtor }).DisplayNames;
      if (!displayNamesCtor) return code;
      const displayNames = new displayNamesCtor(['en'], { type: 'region' });
      const resolved = displayNames.of(code);
      if (resolved && resolved.toUpperCase() !== code) return resolved;
    } catch {
      // Intl.DisplayNames unavailable in older runtimes.
    }

    return code;
  }

  private isInCountry(lat: number, lon: number, code: string): boolean {
    const precise = isCoordinateInCountry(lat, lon, code);
    if (precise != null) return precise;
    const b = App.COUNTRY_BOUNDS[code];
    if (!b) return false;
    return lat >= b.s && lat <= b.n && lon >= b.w && lon <= b.e;
  }

  private getCountrySignals(code: string, country: string): CountryBriefSignals {
    const countryLower = country.toLowerCase();
    const hasGeoShape = hasCountryGeometry(code) || !!App.COUNTRY_BOUNDS[code];

    let protests = 0;
    if (this.intelligenceCache.protests?.events) {
      protests = this.intelligenceCache.protests.events.filter((e) =>
        e.country?.toLowerCase() === countryLower || (hasGeoShape && this.isInCountry(e.lat, e.lon, code))
      ).length;
    }

    let outages = 0;
    if (this.intelligenceCache.outages) {
      outages = this.intelligenceCache.outages.filter((o) =>
        o.country?.toLowerCase() === countryLower || (hasGeoShape && this.isInCountry(o.lat, o.lon, code))
      ).length;
    }

    let earthquakes = 0;
    if (this.intelligenceCache.earthquakes) {
      earthquakes = this.intelligenceCache.earthquakes.filter((eq) => {
        if (hasGeoShape) return this.isInCountry(eq.location?.latitude ?? 0, eq.location?.longitude ?? 0, code);
        return eq.place?.toLowerCase().includes(countryLower);
      }).length;
    }

    const ciiData = getCountryData(code);
    const isTier1 = !!TIER1_COUNTRIES[code];

    return {
      protests,
      outages,
      earthquakes,
      displacementOutflow: ciiData?.displacementOutflow ?? 0,
      climateStress: ciiData?.climateStress ?? 0,
      conflictEvents: ciiData?.conflicts?.length ?? 0,
      militaryFlights: 0,
      militaryVessels: 0,
      isTier1,
    };
  }

  private openCountryStory(code: string, name: string): void {
    if (!dataFreshness.hasSufficientData() || this.latestClusters.length === 0) {
      this.showToast('Data still loading — try again in a moment');
      return;
    }
    const postures: import('@/services/cached-theater-posture').TheaterPostureSummary[] = [];
    const signals = this.getCountrySignals(code, name);
    const cluster = signalAggregator.getCountryClusters().find(c => c.country === code);
    const regional = signalAggregator.getRegionalConvergence().filter(r => r.countries.includes(code));
    const convergence = cluster ? {
      score: cluster.convergenceScore,
      signalTypes: [...cluster.signalTypes],
      regionalDescriptions: regional.map(r => r.description),
    } : null;
    const data = collectStoryData(code, name, this.latestClusters, postures, this.latestPredictions, signals, convergence);
    openStoryModal(data);
  }

  private showToast(msg: string): void {
    document.querySelector('.toast-notification')?.remove();
    const el = document.createElement('div');
    el.className = 'toast-notification';
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => el.classList.add('visible'));
    setTimeout(() => { el.classList.remove('visible'); setTimeout(() => el.remove(), 300); }, 3000);
  }

  private setupSearchModal(): void {
    const searchOptions = {
      placeholder: t('modals.search.placeholder'),
      hint: t('modals.search.hint'),
    };
    this.searchModal = new SearchModal(this.container, searchOptions);

    // Geopolitical sources
    this.searchModal.registerSource('hotspot', INTEL_HOTSPOTS.map(h => ({
      id: h.id,
      title: h.name,
      subtitle: `${h.subtext || ''} ${h.keywords?.join(' ') || ''} ${h.description || ''}`.trim(),
      data: h,
    })));

    this.searchModal.registerSource('base', MILITARY_BASES.map(b => ({
      id: b.id,
      title: b.name,
      subtitle: `${b.type} ${b.description || ''}`.trim(),
      data: b,
    })));

    this.searchModal.registerSource('cable', UNDERSEA_CABLES.map(c => ({
      id: c.id,
      title: c.name,
      subtitle: c.major ? 'Major cable' : '',
      data: c,
    })));

    // Register countries
    this.searchModal.registerSource('country', this.buildCountrySearchItems());

    // Handle result selection
    this.searchModal.setOnSelect((result) => this.handleSearchResult(result));

    // Global keyboard shortcut
    this.boundKeydownHandler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (this.searchModal?.isOpen()) {
          this.searchModal.close();
        } else {
          // Update search index with latest data before opening
          this.updateSearchIndex();
          this.searchModal?.open();
        }
      }
    };
    document.addEventListener('keydown', this.boundKeydownHandler);
  }

  private handleSearchResult(result: SearchResult): void {
    trackSearchResultSelected(result.type);
    switch (result.type) {
      case 'news': {
        // Find and scroll to the news panel containing this item
        const item = result.data as NewsItem;
        this.scrollToPanel('politics');
        this.highlightNewsItem(item.link);
        break;
      }
      case 'hotspot': {
        // Trigger map popup for hotspot
        const hotspot = result.data as typeof INTEL_HOTSPOTS[0];
        this.map?.setView('global');
        setTimeout(() => {
          this.map?.triggerHotspotClick(hotspot.id);
        }, 300);
        break;
      }
      case 'conflict':
        this.map?.setView('global');
        break;
      case 'market': {
        this.scrollToPanel('markets');
        break;
      }
      case 'prediction':
        break;
      case 'base': {
        const base = result.data as typeof MILITARY_BASES[0];
        this.map?.setView('global');
        setTimeout(() => {
          this.map?.triggerBaseClick(base.id);
        }, 300);
        break;
      }
      case 'cable': {
        this.map?.setView('global');
        break;
      }
      case 'datacenter':
      case 'nuclear':
        this.map?.setView('global');
        break;
      case 'earthquake':
      case 'outage':
        // These are dynamic, just switch to map view
        this.map?.setView('global');
        break;
      case 'country': {
        const { code, name } = result.data as { code: string; name: string };
        trackCountrySelected(code, name, 'search');
        this.openCountryBriefByCode(code, name);
        break;
      }
    }
  }

  private scrollToPanel(panelId: string): void {
    const panel = document.querySelector(`[data-panel="${panelId}"]`);
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      panel.classList.add('flash-highlight');
      setTimeout(() => panel.classList.remove('flash-highlight'), 1500);
    }
  }

  private highlightNewsItem(itemId: string): void {
    setTimeout(() => {
      const item = document.querySelector(`[data-news-id="${itemId}"]`);
      if (item) {
        item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.classList.add('flash-highlight');
        setTimeout(() => item.classList.remove('flash-highlight'), 1500);
      }
    }, 100);
  }

  private updateSearchIndex(): void {
    if (!this.searchModal) return;

    // Keep country CII labels fresh with latest ingested signals.
    this.searchModal.registerSource('country', this.buildCountrySearchItems());

    // Update news sources (use link as unique id) - index up to 500 items for better search coverage
    const newsItems = this.allNews.slice(0, 500).map(n => ({
      id: n.link,
      title: n.title,
      subtitle: n.source,
      data: n,
    }));
    console.log(`[Search] Indexing ${newsItems.length} news items (allNews total: ${this.allNews.length})`);
    this.searchModal.registerSource('news', newsItems);

    // Update predictions if available
    if (this.latestPredictions.length > 0) {
      this.searchModal.registerSource('prediction', this.latestPredictions.map(p => ({
        id: p.title,
        title: p.title,
        subtitle: `${Math.round(p.yesPrice)}% probability`,
        data: p,
      })));
    }

    // Update markets if available
    if (this.latestMarkets.length > 0) {
      this.searchModal.registerSource('market', this.latestMarkets.map(m => ({
        id: m.symbol,
        title: `${m.symbol} - ${m.name}`,
        subtitle: `$${m.price?.toFixed(2) || 'N/A'}`,
        data: m,
      })));
    }
  }

  private buildCountrySearchItems(): { id: string; title: string; subtitle: string; data: { code: string; name: string } }[] {
    const scores = calculateCII();
    const ciiByCode = new Map(scores.map((score) => [score.code, score]));
    return Object.entries(TIER1_COUNTRIES).map(([code, name]) => {
      const score = ciiByCode.get(code);
      return {
        id: code,
        title: `${App.toFlagEmoji(code)} ${name}`,
        subtitle: score ? `CII: ${score.score}/100 • ${score.level}` : 'Country Brief',
        data: { code, name },
      };
    });
  }

  private static toFlagEmoji(code: string): string {
    const upperCode = code.toUpperCase();
    if (!/^[A-Z]{2}$/.test(upperCode)) return '🏳️';
    return upperCode
      .split('')
      .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
      .join('');
  }

  private setupPlaybackControl(): void {
    this.playbackControl = new PlaybackControl();
    this.playbackControl.onSnapshot((snapshot) => {
      if (snapshot) {
        this.isPlaybackMode = true;
        this.restoreSnapshot(snapshot);
      } else {
        this.isPlaybackMode = false;
        this.loadAllData();
      }
    });

    const headerRight = this.container.querySelector('.header-right');
    if (headerRight) {
      headerRight.insertBefore(this.playbackControl.getElement(), headerRight.firstChild);
    }
  }

  private setupSnapshotSaving(): void {
    const saveCurrentSnapshot = async () => {
      if (this.isPlaybackMode || this.isDestroyed) return;

      const marketPrices: Record<string, number> = {};
      this.latestMarkets.forEach(m => {
        if (m.price !== null) marketPrices[m.symbol] = m.price;
      });

      await saveSnapshot({
        timestamp: Date.now(),
        events: this.latestClusters,
        marketPrices,
        predictions: this.latestPredictions.map(p => ({
          title: p.title,
          yesPrice: p.yesPrice
        })),
        hotspotLevels: this.map?.getHotspotLevels() ?? {}
      });
    };

    void saveCurrentSnapshot().catch((e) => console.warn('[Snapshot] save failed:', e));
    this.snapshotIntervalId = setInterval(() => void saveCurrentSnapshot().catch((e) => console.warn('[Snapshot] save failed:', e)), 15 * 60 * 1000);
  }

  private restoreSnapshot(snapshot: import('@/services/storage').DashboardSnapshot): void {
    for (const panel of Object.values(this.newsPanels)) {
      panel.showLoading();
    }

    const events = snapshot.events as ClusteredEvent[];
    this.latestClusters = events;

    const predictions = snapshot.predictions.map((p, i) => ({
      id: `snap-${i}`,
      title: p.title,
      yesPrice: p.yesPrice,
      noPrice: 100 - p.yesPrice,
      volume24h: 0,
      liquidity: 0,
    }));
    this.latestPredictions = predictions;
    this.map?.setHotspotLevels(snapshot.hotspotLevels);
  }

  private renderLayout(): void {
    this.container.innerHTML = `
      <div class="header">
        <div class="header-left">
          <img src="/logo-fodi.png" alt="Fodi-eyes" class="header-logo" style="height:28px;margin-right:6px;vertical-align:middle;" /><span class="logo">FODI-EYES</span><span class="version">v${__APP_VERSION__}</span>${BETA_MODE ? '<span class="beta-badge">BETA</span>' : ''}
          <span class="credit-link">
            <span class="credit-text">by Fodi S.r.l.</span>
          </span>
          <div class="status-indicator">
            <span class="status-dot"></span>
            <span>${t('header.live')}</span>
          </div>
        </div>
        <div class="header-right">
          <span class="header-clock" id="headerClock"></span>
          <button class="search-btn" id="searchBtn"><kbd>⌘K</kbd> ${t('header.search')}</button>
          ${this.isDesktopApp ? '' : `<button class="copy-link-btn" id="copyLinkBtn">${t('header.copyLink')}</button>`}
          <button class="theme-toggle-btn" id="headerThemeToggle" title="${t('header.toggleTheme')}">
            ${getCurrentTheme() === 'dark'
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>'}
          </button>
          ${this.isDesktopApp ? '' : `<button class="fullscreen-btn" id="fullscreenBtn" title="${t('header.fullscreen')}">⛶</button>`}
          <button class="settings-btn" id="settingsBtn">⚙ ${t('header.settings')}</button>
          <button class="sources-btn" id="sourcesBtn">📡 ${t('header.sources')}</button>
        </div>
      </div>
      <div class="main-content">
        <div class="map-fullscreen" id="mapFullscreen">
          <div class="map-container" id="mapContainer"></div>
        </div>
        <div id="sidebarMount"></div>
        <button class="sidebar-toggle" id="sidebarToggle">◀</button>
      </div>
      <div class="modal-overlay" id="settingsModal">
        <div class="modal">
          <div class="modal-header">
            <span class="modal-title">${t('header.settings')}</span>
            <button class="modal-close" id="modalClose">×</button>
          </div>
          <div class="panel-toggle-grid" id="panelToggles"></div>
        </div>
      </div>
      <div class="modal-overlay" id="sourcesModal">
        <div class="modal sources-modal">
          <div class="modal-header">
            <span class="modal-title">${t('header.sources')}</span>
            <span class="sources-counter" id="sourcesCounter"></span>
            <button class="modal-close" id="sourcesModalClose">×</button>
          </div>
          <div class="sources-search">
            <input type="text" id="sourcesSearch" placeholder="${t('header.filterSources')}" />
          </div>
          <div class="sources-toggle-grid" id="sourceToggles"></div>
          <div class="sources-footer">
            <button class="sources-select-all" id="sourcesSelectAll">${t('common.selectAll')}</button>
            <button class="sources-select-none" id="sourcesSelectNone">${t('common.selectNone')}</button>
          </div>
        </div>
      </div>
    `;

    this.createPanels();
    this.renderPanelToggles();
  }

  /**
   * Clean up resources (for HMR/testing)
   */
  public destroy(): void {
    this.isDestroyed = true;

    // Clear snapshot saving interval
    if (this.snapshotIntervalId) {
      clearInterval(this.snapshotIntervalId);
      this.snapshotIntervalId = null;
    }

    if (this.updateCheckIntervalId) {
      clearInterval(this.updateCheckIntervalId);
      this.updateCheckIntervalId = null;
    }

    if (this.clockIntervalId) {
      clearInterval(this.clockIntervalId);
      this.clockIntervalId = null;
    }

    // Clear all refresh timeouts
    for (const timeoutId of this.refreshTimeoutIds.values()) {
      clearTimeout(timeoutId);
    }
    this.refreshTimeoutIds.clear();

    // Remove global event listeners
    if (this.boundKeydownHandler) {
      document.removeEventListener('keydown', this.boundKeydownHandler);
      this.boundKeydownHandler = null;
    }
    if (this.boundFullscreenHandler) {
      document.removeEventListener('fullscreenchange', this.boundFullscreenHandler);
      this.boundFullscreenHandler = null;
    }
    if (this.boundResizeHandler) {
      window.removeEventListener('resize', this.boundResizeHandler);
      this.boundResizeHandler = null;
    }
    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }

    // Clean up idle detection
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
      this.idleTimeoutId = null;
    }
    if (this.boundIdleResetHandler) {
      ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(event => {
        document.removeEventListener(event, this.boundIdleResetHandler!);
      });
      this.boundIdleResetHandler = null;
    }

    // Clean up map
    this.map?.destroy();
  }

  private sidebar: Sidebar | null = null;

  private createPanels(): void {
    // Initialize map fullscreen
    const mapContainer = document.getElementById('mapContainer') as HTMLElement;
    this.map = new MapContainer(mapContainer, {
      zoom: this.isMobile ? 2.5 : 1.0,
      pan: { x: 0, y: 0 },
      view: 'eu',
      layers: this.mapLayers,
      timeRange: '7d',
    });

    this.map.initEscalationGetters();
    this.currentTimeRange = this.map.getTimeRange();

    // === TAB: News ===
    const liveNewsPanel = new LiveNewsPanel();
    this.panels['live-news'] = liveNewsPanel;

    const politicsPanel = new NewsPanel('politics', t('panels.politics'));
    this.attachRelatedAssetHandlers(politicsPanel);
    this.newsPanels['politics'] = politicsPanel;
    this.panels['politics'] = politicsPanel;

    const intelPanel = new NewsPanel('intel', t('panels.intel'));
    this.attachRelatedAssetHandlers(intelPanel);
    this.newsPanels['intel'] = intelPanel;
    this.panels['intel'] = intelPanel;

    const govPanel = new NewsPanel('gov', t('panels.gov'));
    this.attachRelatedAssetHandlers(govPanel);
    this.newsPanels['gov'] = govPanel;
    this.panels['gov'] = govPanel;

    const thinktanksPanel = new NewsPanel('thinktanks', t('panels.thinktanks'));
    this.attachRelatedAssetHandlers(thinktanksPanel);
    this.newsPanels['thinktanks'] = thinktanksPanel;
    this.panels['thinktanks'] = thinktanksPanel;

    const energyPanel = new NewsPanel('energy', t('panels.energy'));
    this.attachRelatedAssetHandlers(energyPanel);
    this.newsPanels['energy'] = energyPanel;
    this.panels['energy'] = energyPanel;

    const techPanel = new NewsPanel('tech', t('panels.tech'));
    this.attachRelatedAssetHandlers(techPanel);
    this.newsPanels['tech'] = techPanel;
    this.panels['tech'] = techPanel;

    const aiPanel = new NewsPanel('ai', t('panels.ai'));
    this.attachRelatedAssetHandlers(aiPanel);
    this.newsPanels['ai'] = aiPanel;
    this.panels['ai'] = aiPanel;

    // === TAB: Webcam ===
    const webcamPanel = new TerritorialWebcamsPanel();
    this.panels['webcam-territoriali'] = webcamPanel;
    webcamPanel.setWebcamSelectHandler((webcam) => {
      this.map?.setCenter(webcam.lat, webcam.lon, 12);
    });

    // === TAB: Intel ===
    const entitySearchPanel = new EntitySearchPanel();
    this.panels['entity-search'] = entitySearchPanel;

    const osintArsenalPanel = new OsintArsenalPanel();
    this.panels['osint-arsenal'] = osintArsenalPanel;

    const insightsPanel = new InsightsPanel();
    this.panels['insights'] = insightsPanel;

    // === TAB: Dati ===
    const italiaDataPanel = new ItaliaDataPanel();
    this.panels['italia-data'] = italiaDataPanel;

    const openDataPanel = new OpenDataPanel();
    this.panels['open-data'] = openDataPanel;

    const economicPanel = new EconomicPanel();
    this.panels['economic'] = economicPanel;

    const marketsPanel = new MarketPanel();
    this.panels['markets'] = marketsPanel;

    const politicsItalyPanel = new PoliticsItalyPanel();
    this.panels['politics-italy'] = politicsItalyPanel;

    // === TAB: Tools ===
    const monitorPanel = new MonitorPanel(this.monitors);
    this.panels['monitors'] = monitorPanel;
    monitorPanel.onChanged((monitors) => {
      this.monitors = monitors;
      saveToStorage(STORAGE_KEYS.monitors, monitors);
      this.updateMonitorResults();
    });

    const serviceStatusPanel = new ServiceStatusPanel();
    this.panels['service-status'] = serviceStatusPanel;

    const satelliteFiresPanel = new SatelliteFiresPanel();
    this.panels['satellite-fires'] = satelliteFiresPanel;

    const climatePanel = new ClimateAnomalyPanel();
    climatePanel.setZoneClickHandler((lat, lon) => {
      this.map?.setCenter(lat, lon, 4);
    });
    this.panels['climate'] = climatePanel;

    if (this.isDesktopApp) {
      const runtimeConfigPanel = new RuntimeConfigPanel({ mode: 'alert' });
      this.panels['runtime-config'] = runtimeConfigPanel;
    }

    // Dynamically create NewsPanel instances for any remaining FEEDS category
    for (const key of Object.keys(FEEDS)) {
      if (this.newsPanels[key]) continue;
      if (!Array.isArray((FEEDS as Record<string, unknown>)[key])) continue;
      const panelKey = this.panels[key] && !this.newsPanels[key] ? `${key}-news` : key;
      if (this.panels[panelKey]) continue;
      const panelConfig = DEFAULT_PANELS[panelKey] ?? DEFAULT_PANELS[key];
      const label = panelConfig?.name ?? key.charAt(0).toUpperCase() + key.slice(1);
      const panel = new NewsPanel(panelKey, label);
      this.attachRelatedAssetHandlers(panel);
      this.newsPanels[key] = panel;
      this.panels[panelKey] = panel;
    }

    // === SIDEBAR ===
    this.sidebar = new Sidebar();
    this.sidebar.registerPanels('news', [
      liveNewsPanel, politicsPanel, intelPanel, govPanel,
      thinktanksPanel, energyPanel, techPanel, aiPanel,
    ]);
    this.sidebar.registerPanels('webcam', [webcamPanel]);
    this.sidebar.registerPanels('intel', [entitySearchPanel, osintArsenalPanel, insightsPanel]);
    this.sidebar.registerPanels('dati', [italiaDataPanel, openDataPanel, economicPanel, marketsPanel, politicsItalyPanel]);
    this.sidebar.registerPanels('tools', [
      monitorPanel, serviceStatusPanel, satelliteFiresPanel, climatePanel,
      ...(this.isDesktopApp && this.panels['runtime-config'] ? [this.panels['runtime-config']] : []),
    ]);

    const sidebarMount = document.getElementById('sidebarMount');
    if (sidebarMount) {
      sidebarMount.replaceWith(this.sidebar.getElement());
    }

    // Sidebar toggle
    document.getElementById('sidebarToggle')?.addEventListener('click', () => {
      this.sidebar?.toggle();
      const toggleBtn = document.getElementById('sidebarToggle');
      if (toggleBtn) {
        toggleBtn.textContent = this.sidebar?.isCollapsed() ? '▶' : '◀';
      }
    });

    this.map.onTimeRangeChanged((range) => {
      this.currentTimeRange = range;
      this.applyTimeRangeFilterToNewsPanelsDebounced();
    });

    this.applyPanelSettings();
    this.applyInitialUrlState();

  }

  private applyInitialUrlState(): void {
    if (!this.initialUrlState || !this.map) return;

    const { view, zoom, lat, lon, timeRange, layers } = this.initialUrlState;

    if (view) {
      this.map.setView(view);
    }

    if (timeRange) {
      this.map.setTimeRange(timeRange);
    }

    if (layers) {
      this.mapLayers = layers;
      saveToStorage(STORAGE_KEYS.mapLayers, this.mapLayers);
      this.map.setLayers(layers);
    }

    // Only apply custom lat/lon/zoom if NO view preset is specified
    // When a view is specified (eu, mena, etc.), use the preset's positioning
    if (!view) {
      if (zoom !== undefined) {
        this.map.setZoom(zoom);
      }

      // Only apply lat/lon if user has zoomed in significantly (zoom > 2)
      // At default zoom (~1-1.5), show centered global view to avoid clipping issues
      if (lat !== undefined && lon !== undefined && zoom !== undefined && zoom > 2) {
        this.map.setCenter(lat, lon);
      }
    }

  }

  private attachRelatedAssetHandlers(panel: NewsPanel): void {
    panel.setRelatedAssetHandlers({
      onRelatedAssetClick: (asset) => this.handleRelatedAssetClick(asset),
      onRelatedAssetsFocus: (assets) => this.map?.highlightAssets(assets),
      onRelatedAssetsClear: () => this.map?.highlightAssets(null),
    });
  }

  private handleRelatedAssetClick(asset: RelatedAsset): void {
    if (!this.map) return;

    switch (asset.type) {
      case 'base':
        this.map.enableLayer('bases');
        this.mapLayers.bases = true;
        saveToStorage(STORAGE_KEYS.mapLayers, this.mapLayers);
        this.map.triggerBaseClick(asset.id);
        break;
    }
  }

  private setupEventListeners(): void {
    // Search button
    document.getElementById('searchBtn')?.addEventListener('click', () => {
      this.updateSearchIndex();
      this.searchModal?.open();
    });

    // Copy link button
    document.getElementById('copyLinkBtn')?.addEventListener('click', async () => {
      const shareUrl = this.getShareUrl();
      if (!shareUrl) return;
      const button = document.getElementById('copyLinkBtn');
      try {
        await this.copyToClipboard(shareUrl);
        this.setCopyLinkFeedback(button, 'Copied!');
      } catch (error) {
        console.warn('Failed to copy share link:', error);
        this.setCopyLinkFeedback(button, 'Copy failed');
      }
    });

    // Settings modal
    document.getElementById('settingsBtn')?.addEventListener('click', () => {
      document.getElementById('settingsModal')?.classList.add('active');
    });

    document.getElementById('modalClose')?.addEventListener('click', () => {
      document.getElementById('settingsModal')?.classList.remove('active');
    });

    document.getElementById('settingsModal')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement)?.classList?.contains('modal-overlay')) {
        document.getElementById('settingsModal')?.classList.remove('active');
      }
    });


    // Header theme toggle button
    document.getElementById('headerThemeToggle')?.addEventListener('click', () => {
      const next = getCurrentTheme() === 'dark' ? 'light' : 'dark';
      setTheme(next);
      this.updateHeaderThemeIcon();
      trackThemeChanged(next);
    });

    // Sources modal
    this.setupSourcesModal();

    // Fullscreen toggle
    const fullscreenBtn = document.getElementById('fullscreenBtn');
    if (!this.isDesktopApp && fullscreenBtn) {
      fullscreenBtn.addEventListener('click', () => this.toggleFullscreen());
      this.boundFullscreenHandler = () => {
        fullscreenBtn.textContent = document.fullscreenElement ? '⛶' : '⛶';
        fullscreenBtn.classList.toggle('active', !!document.fullscreenElement);
      };
      document.addEventListener('fullscreenchange', this.boundFullscreenHandler);
    }

    // Region selector removed — map-centered layout

    // Language selector
    const langSelect = document.getElementById('langSelect') as HTMLSelectElement;
    langSelect?.addEventListener('change', () => {
      void changeLanguage(langSelect.value);
    });

    // Window resize
    this.boundResizeHandler = () => {
      this.map?.render();
    };
    window.addEventListener('resize', this.boundResizeHandler);

    // Map section resize handle
    this.setupMapResize();

    // Map pin toggle
    this.setupMapPin();

    // Pause animations when tab is hidden, unload ML models to free memory
    this.boundVisibilityHandler = () => {
      document.body.classList.toggle('animations-paused', document.hidden);
      if (document.hidden) {
        mlWorker.unloadOptionalModels();
      } else {
        this.resetIdleTimer();
      }
    };
    document.addEventListener('visibilitychange', this.boundVisibilityHandler);

    // Re-render components with baked getCSSColor() values on theme change
    window.addEventListener('theme-changed', () => {
      this.map?.render();
      this.updateHeaderThemeIcon();
    });

    // Idle detection - pause animations after 2 minutes of inactivity
    this.setupIdleDetection();
  }

  private setupIdleDetection(): void {
    this.boundIdleResetHandler = () => {
      // User is active - resume animations if we were idle
      if (this.isIdle) {
        this.isIdle = false;
        document.body.classList.remove('animations-paused');
      }
      this.resetIdleTimer();
    };

    // Track user activity
    ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove'].forEach(event => {
      document.addEventListener(event, this.boundIdleResetHandler!, { passive: true });
    });

    // Start the idle timer
    this.resetIdleTimer();
  }

  private resetIdleTimer(): void {
    if (this.idleTimeoutId) {
      clearTimeout(this.idleTimeoutId);
    }
    this.idleTimeoutId = setTimeout(() => {
      if (!document.hidden) {
        this.isIdle = true;
        document.body.classList.add('animations-paused');
        console.log('[App] User idle - pausing animations to save resources');
      }
    }, this.IDLE_PAUSE_MS);
  }

  private setupUrlStateSync(): void {
    if (!this.map) return;
    const update = debounce(() => {
      const shareUrl = this.getShareUrl();
      if (!shareUrl) return;
      history.replaceState(null, '', shareUrl);
    }, 250);

    this.map.onStateChanged(() => {
      update();
    });
    update();
  }

  private getShareUrl(): string | null {
    if (!this.map) return null;
    const state = this.map.getState();
    const center = this.map.getCenter();
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    return buildMapUrl(baseUrl, {
      view: state.view,
      zoom: state.zoom,
      center,
      timeRange: state.timeRange,
      layers: state.layers,
      country: undefined,
    });
  }

  private async copyToClipboard(text: string): Promise<void> {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }

  private setCopyLinkFeedback(button: HTMLElement | null, message: string): void {
    if (!button) return;
    const originalText = button.textContent ?? '';
    button.textContent = message;
    button.classList.add('copied');
    window.setTimeout(() => {
      button.textContent = originalText;
      button.classList.remove('copied');
    }, 1500);
  }

  private toggleFullscreen(): void {
    if (document.fullscreenElement) {
      try { void document.exitFullscreen()?.catch(() => {}); } catch {}
    } else {
      const el = document.documentElement as HTMLElement & { webkitRequestFullscreen?: () => void };
      if (el.requestFullscreen) {
        try { void el.requestFullscreen()?.catch(() => {}); } catch {}
      } else if (el.webkitRequestFullscreen) {
        try { el.webkitRequestFullscreen(); } catch {}
      }
    }
  }

  private setupMapResize(): void {
    // mapResizeHandle removed — map is fullscreen in new layout
    return;
  }

  private setupMapPin(): void {
    // mapPinBtn removed — map is fullscreen in new layout
    return;
  }

  private renderPanelToggles(): void {
    const container = document.getElementById('panelToggles')!;
    const panelHtml = Object.entries(this.panelSettings)
      .filter(([key]) => key !== 'runtime-config' || this.isDesktopApp)
      .map(
        ([key, panel]) => `
        <div class="panel-toggle-item ${panel.enabled ? 'active' : ''}" data-panel="${key}">
          <div class="panel-toggle-checkbox">${panel.enabled ? '✓' : ''}</div>
          <span class="panel-toggle-label">${this.getLocalizedPanelName(key, panel.name)}</span>
        </div>
      `
      )
      .join('');

    const findingsHtml = this.isMobile
      ? ''
      : (() => {
        const findingsEnabled = this.findingsBadge?.isEnabled() ?? IntelligenceGapBadge.getStoredEnabledState();
        return `
      <div class="panel-toggle-item ${findingsEnabled ? 'active' : ''}" data-panel="intel-findings">
        <div class="panel-toggle-checkbox">${findingsEnabled ? '✓' : ''}</div>
        <span class="panel-toggle-label">Intelligence Findings</span>
      </div>
    `;
      })();

    container.innerHTML = panelHtml + findingsHtml;

    container.querySelectorAll('.panel-toggle-item').forEach((item) => {
      item.addEventListener('click', () => {
        const panelKey = (item as HTMLElement).dataset.panel!;

        if (panelKey === 'intel-findings') {
          if (!this.findingsBadge) return;
          const newState = !this.findingsBadge.isEnabled();
          this.findingsBadge.setEnabled(newState);
          trackPanelToggled('intel-findings', newState);
          this.renderPanelToggles();
          return;
        }

        const config = this.panelSettings[panelKey];
        console.log('[Panel Toggle] Clicked:', panelKey, 'Current enabled:', config?.enabled);
        if (config) {
          config.enabled = !config.enabled;
          trackPanelToggled(panelKey, config.enabled);
          console.log('[Panel Toggle] New enabled:', config.enabled);
          saveToStorage(STORAGE_KEYS.panels, this.panelSettings);
          this.renderPanelToggles();
          this.applyPanelSettings();
          console.log('[Panel Toggle] After apply - config.enabled:', this.panelSettings[panelKey]?.enabled);
        }
      });
    });
  }

  private getLocalizedPanelName(panelKey: string, fallback: string): string {
    if (panelKey === 'runtime-config') {
      return t('modals.runtimeConfig.title');
    }
    const key = panelKey.replace(/-([a-z])/g, (_match, group: string) => group.toUpperCase());
    const lookup = `panels.${key}`;
    const localized = t(lookup);
    return localized === lookup ? fallback : localized;
  }

  private getAllSourceNames(): string[] {
    const sources = new Set<string>();
    Object.values(FEEDS).forEach(feeds => {
      if (feeds) feeds.forEach(f => sources.add(f.name));
    });
    INTEL_SOURCES.forEach(f => sources.add(f.name));
    return Array.from(sources).sort((a, b) => a.localeCompare(b));
  }

  private renderSourceToggles(filter = ''): void {
    const container = document.getElementById('sourceToggles')!;
    const allSources = this.getAllSourceNames();
    const filterLower = filter.toLowerCase();
    const filteredSources = filter
      ? allSources.filter(s => s.toLowerCase().includes(filterLower))
      : allSources;

    container.innerHTML = filteredSources.map(source => {
      const isEnabled = !this.disabledSources.has(source);
      const escaped = escapeHtml(source);
      return `
        <div class="source-toggle-item ${isEnabled ? 'active' : ''}" data-source="${escaped}">
          <div class="source-toggle-checkbox">${isEnabled ? '✓' : ''}</div>
          <span class="source-toggle-label">${escaped}</span>
        </div>
      `;
    }).join('');

    container.querySelectorAll('.source-toggle-item').forEach(item => {
      item.addEventListener('click', () => {
        const sourceName = (item as HTMLElement).dataset.source!;
        if (this.disabledSources.has(sourceName)) {
          this.disabledSources.delete(sourceName);
        } else {
          this.disabledSources.add(sourceName);
        }
        saveToStorage(STORAGE_KEYS.disabledFeeds, Array.from(this.disabledSources));
        this.renderSourceToggles(filter);
      });
    });

    // Update counter
    const enabledCount = allSources.length - this.disabledSources.size;
    const counterEl = document.getElementById('sourcesCounter');
    if (counterEl) {
      counterEl.textContent = t('header.sourcesEnabled', { enabled: String(enabledCount), total: String(allSources.length) });
    }
  }

  private setupSourcesModal(): void {
    document.getElementById('sourcesBtn')?.addEventListener('click', () => {
      document.getElementById('sourcesModal')?.classList.add('active');
      // Clear search and show all sources on open
      const searchInput = document.getElementById('sourcesSearch') as HTMLInputElement | null;
      if (searchInput) searchInput.value = '';
      this.renderSourceToggles();
    });

    document.getElementById('sourcesModalClose')?.addEventListener('click', () => {
      document.getElementById('sourcesModal')?.classList.remove('active');
    });

    document.getElementById('sourcesModal')?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement)?.classList?.contains('modal-overlay')) {
        document.getElementById('sourcesModal')?.classList.remove('active');
      }
    });

    document.getElementById('sourcesSearch')?.addEventListener('input', (e) => {
      const filter = (e.target as HTMLInputElement).value;
      this.renderSourceToggles(filter);
    });

    document.getElementById('sourcesSelectAll')?.addEventListener('click', () => {
      this.disabledSources.clear();
      saveToStorage(STORAGE_KEYS.disabledFeeds, []);
      const filter = (document.getElementById('sourcesSearch') as HTMLInputElement)?.value || '';
      this.renderSourceToggles(filter);
    });

    document.getElementById('sourcesSelectNone')?.addEventListener('click', () => {
      const allSources = this.getAllSourceNames();
      this.disabledSources = new Set(allSources);
      saveToStorage(STORAGE_KEYS.disabledFeeds, allSources);
      const filter = (document.getElementById('sourcesSearch') as HTMLInputElement)?.value || '';
      this.renderSourceToggles(filter);
    });
  }

  private applyPanelSettings(): void {
    Object.entries(this.panelSettings).forEach(([key, config]) => {
      if (key === 'map') {
        const mapSection = document.getElementById('mapSection');
        if (mapSection) {
          mapSection.classList.toggle('hidden', !config.enabled);
        }
        return;
      }
      const panel = this.panels[key];
      panel?.toggle(config.enabled);
    });
  }

  private updateHeaderThemeIcon(): void {
    const btn = document.getElementById('headerThemeToggle');
    if (!btn) return;
    const isDark = getCurrentTheme() === 'dark';
    btn.innerHTML = isDark
      ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
      : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>';
  }

  private async loadAllData(): Promise<void> {
    const runGuarded = async (name: string, fn: () => Promise<void>): Promise<void> => {
      if (this.inFlight.has(name)) return;
      this.inFlight.add(name);
      try {
        await fn();
      } catch (e) {
        console.error(`[App] ${name} failed:`, e);
      } finally {
        this.inFlight.delete(name);
      }
    };

    const tasks: Array<{ name: string; task: Promise<void> }> = [
      { name: 'news', task: runGuarded('news', () => this.loadNews()) },
      { name: 'markets', task: runGuarded('markets', () => this.loadMarkets()) },
      { name: 'predictions', task: runGuarded('predictions', () => this.loadPredictions()) },
      { name: 'pizzint', task: runGuarded('pizzint', () => this.loadPizzInt()) },
      { name: 'fred', task: runGuarded('fred', () => this.loadFredData()) },
      { name: 'oil', task: runGuarded('oil', () => this.loadOilAnalytics()) },
      { name: 'spending', task: runGuarded('spending', () => this.loadGovernmentSpending()) },
      { name: 'intelligence', task: runGuarded('intelligence', () => this.loadIntelligenceSignals()) },
      { name: 'firms', task: runGuarded('firms', () => this.loadFirmsData()) },
    ];

    // Conditionally load non-intelligence layers
    if (this.mapLayers.natural) tasks.push({ name: 'natural', task: runGuarded('natural', () => this.loadNatural()) });
    if (this.mapLayers.weather) tasks.push({ name: 'weather', task: runGuarded('weather', () => this.loadWeatherAlerts()) });
    if (CYBER_LAYER_ENABLED && this.mapLayers.cyberThreats) tasks.push({ name: 'cyberThreats', task: runGuarded('cyberThreats', () => this.loadCyberThreats()) });

    // Italy OSINT panels
    tasks.push({ name: 'italiaData', task: runGuarded('italiaData', () => (this.panels['italia-data'] as ItaliaDataPanel)?.fetchData()) });
    tasks.push({ name: 'politicsItaly', task: runGuarded('politicsItaly', () => (this.panels['politics-italy'] as PoliticsItalyPanel)?.fetchData()) });
    // Fetch Italy GeoJSON boundaries for map layer
    tasks.push({
      name: 'italyBoundaries', task: runGuarded('italyBoundaries', async () => {
        const geojson = await fetchItalyRegions();
        if (geojson && this.map) {
          this.map.setItalyRegionsGeoJson(geojson);
        }
      })
    });

    // Use allSettled to ensure all tasks complete and search index always updates
    const results = await Promise.allSettled(tasks.map(t => t.task));

    // Log any failures but don't block
    results.forEach((result, idx) => {
      if (result.status === 'rejected') {
        console.error(`[App] ${tasks[idx]?.name} load failed:`, result.reason);
      }
    });

    // Always update search index regardless of individual task failures
    this.updateSearchIndex();
  }

  private async loadDataForLayer(layer: keyof MapLayers): Promise<void> {
    if (this.inFlight.has(layer)) return;
    this.inFlight.add(layer);
    this.map?.setLayerLoading(layer, true);
    try {
      switch (layer) {
        case 'natural':
          await this.loadNatural();
          break;
        case 'fires':
          await this.loadFirmsData();
          break;
        case 'weather':
          await this.loadWeatherAlerts();
          break;
        case 'outages':
          await this.loadOutages();
          break;
        case 'cyberThreats':
          await this.loadCyberThreats();
          break;
        case 'climate':
          await this.loadIntelligenceSignals();
          break;
      }
    } finally {
      this.inFlight.delete(layer);
      this.map?.setLayerLoading(layer, false);
    }
  }

  private findFlashLocation(title: string): { lat: number; lon: number } | null {
    const titleLower = title.toLowerCase();
    let bestMatch: { lat: number; lon: number; matches: number } | null = null;

    const countKeywordMatches = (keywords: string[] | undefined): number => {
      if (!keywords) return 0;
      let matches = 0;
      for (const keyword of keywords) {
        const cleaned = keyword.trim().toLowerCase();
        if (cleaned.length >= 3 && titleLower.includes(cleaned)) {
          matches++;
        }
      }
      return matches;
    };

    for (const hotspot of INTEL_HOTSPOTS) {
      const matches = countKeywordMatches(hotspot.keywords);
      if (matches > 0 && (!bestMatch || matches > bestMatch.matches)) {
        bestMatch = { lat: hotspot.lat, lon: hotspot.lon, matches };
      }
    }

    return bestMatch;
  }

  private flashMapForNews(items: NewsItem[]): void {
    if (!this.map || !this.initialLoadComplete) return;
    const now = Date.now();

    for (const [key, timestamp] of this.mapFlashCache.entries()) {
      if (now - timestamp > this.MAP_FLASH_COOLDOWN_MS) {
        this.mapFlashCache.delete(key);
      }
    }

    for (const item of items) {
      const cacheKey = `${item.source}|${item.link || item.title}`;
      const lastSeen = this.mapFlashCache.get(cacheKey);
      if (lastSeen && now - lastSeen < this.MAP_FLASH_COOLDOWN_MS) {
        continue;
      }

      const location = this.findFlashLocation(item.title);
      if (!location) continue;

      this.map.flashLocation(location.lat, location.lon);
      this.mapFlashCache.set(cacheKey, now);
    }
  }

  private getTimeRangeWindowMs(range: TimeRange): number {
    const ranges: Record<TimeRange, number> = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '48h': 48 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      'all': Infinity,
    };
    return ranges[range];
  }

  private filterItemsByTimeRange(items: NewsItem[], range: TimeRange = this.currentTimeRange): NewsItem[] {
    if (range === 'all') return items;
    const cutoff = Date.now() - this.getTimeRangeWindowMs(range);
    return items.filter((item) => {
      const ts = item.pubDate instanceof Date ? item.pubDate.getTime() : new Date(item.pubDate).getTime();
      return Number.isFinite(ts) ? ts >= cutoff : true;
    });
  }

  private getTimeRangeLabel(range: TimeRange = this.currentTimeRange): string {
    const labels: Record<TimeRange, string> = {
      '1h': 'the last hour',
      '6h': 'the last 6 hours',
      '24h': 'the last 24 hours',
      '48h': 'the last 48 hours',
      '7d': 'the last 7 days',
      'all': 'all time',
    };
    return labels[range];
  }

  private renderNewsForCategory(category: string, items: NewsItem[]): void {
    this.newsByCategory[category] = items;
    const panel = this.newsPanels[category];
    if (!panel) return;
    const filteredItems = this.filterItemsByTimeRange(items);
    if (filteredItems.length === 0 && items.length > 0) {
      panel.renderFilteredEmpty(`No items in ${this.getTimeRangeLabel()}`);
      return;
    }
    panel.renderNews(filteredItems);
  }

  private applyTimeRangeFilterToNewsPanels(): void {
    Object.entries(this.newsByCategory).forEach(([category, items]) => {
      this.renderNewsForCategory(category, items);
    });
  }

  private async loadNewsCategory(category: string, feeds: typeof FEEDS.politics): Promise<NewsItem[]> {
    try {
      const panel = this.newsPanels[category];
      const renderIntervalMs = 100;
      let lastRenderTime = 0;
      let renderTimeout: ReturnType<typeof setTimeout> | null = null;
      let pendingItems: NewsItem[] | null = null;

      // Filter out disabled sources
      const enabledFeeds = (feeds ?? []).filter(f => !this.disabledSources.has(f.name));
      if (enabledFeeds.length === 0) {
        delete this.newsByCategory[category];
        if (panel) panel.showError(t('common.allSourcesDisabled'));
        this.statusPanel?.updateFeed(category.charAt(0).toUpperCase() + category.slice(1), {
          status: 'ok',
          itemCount: 0,
        });
        return [];
      }

      const flushPendingRender = () => {
        if (!pendingItems) return;
        this.renderNewsForCategory(category, pendingItems);
        pendingItems = null;
        lastRenderTime = Date.now();
      };

      const scheduleRender = (partialItems: NewsItem[]) => {
        if (!panel) return;
        pendingItems = partialItems;
        const elapsed = Date.now() - lastRenderTime;
        if (elapsed >= renderIntervalMs) {
          if (renderTimeout) {
            clearTimeout(renderTimeout);
            renderTimeout = null;
          }
          flushPendingRender();
          return;
        }

        if (!renderTimeout) {
          renderTimeout = setTimeout(() => {
            renderTimeout = null;
            flushPendingRender();
          }, renderIntervalMs - elapsed);
        }
      };

      const items = await fetchCategoryFeeds(enabledFeeds, {
        onBatch: (partialItems) => {
          scheduleRender(partialItems);
          this.flashMapForNews(partialItems);
        },
      });

      this.renderNewsForCategory(category, items);
      if (panel) {
        if (renderTimeout) {
          clearTimeout(renderTimeout);
          renderTimeout = null;
          pendingItems = null;
        }

        if (items.length === 0) {
          const failures = getFeedFailures();
          const failedFeeds = enabledFeeds.filter(f => failures.has(f.name));
          if (failedFeeds.length > 0) {
            const names = failedFeeds.map(f => f.name).join(', ');
            panel.showError(`${t('common.noNewsAvailable')} (${names} failed)`);
          }
        }

        try {
          const baseline = await updateBaseline(`news:${category}`, items.length);
          const deviation = calculateDeviation(items.length, baseline);
          panel.setDeviation(deviation.zScore, deviation.percentChange, deviation.level);
        } catch (e) { console.warn(`[Baseline] news:${category} write failed:`, e); }
      }

      this.statusPanel?.updateFeed(category.charAt(0).toUpperCase() + category.slice(1), {
        status: 'ok',
        itemCount: items.length,
      });
      this.statusPanel?.updateApi('RSS2JSON', { status: 'ok' });

      return items;
    } catch (error) {
      this.statusPanel?.updateFeed(category.charAt(0).toUpperCase() + category.slice(1), {
        status: 'error',
        errorMessage: String(error),
      });
      this.statusPanel?.updateApi('RSS2JSON', { status: 'error' });
      delete this.newsByCategory[category];
      return [];
    }
  }

  private async loadNews(): Promise<void> {
    // Build categories dynamically from whatever feeds the current variant exports
    const categories = Object.entries(FEEDS)
      .filter((entry): entry is [string, typeof FEEDS[keyof typeof FEEDS]] => Array.isArray(entry[1]) && entry[1].length > 0)
      .map(([key, feeds]) => ({ key, feeds }));

    // Stage category fetches to avoid startup bursts and API pressure.
    const maxCategoryConcurrency = 5;
    const categoryConcurrency = Math.max(1, Math.min(maxCategoryConcurrency, categories.length));
    const categoryResults: PromiseSettledResult<NewsItem[]>[] = [];
    for (let i = 0; i < categories.length; i += categoryConcurrency) {
      const chunk = categories.slice(i, i + categoryConcurrency);
      const chunkResults = await Promise.allSettled(
        chunk.map(({ key, feeds }) => this.loadNewsCategory(key, feeds))
      );
      categoryResults.push(...chunkResults);
    }

    // Collect successful results
    const collectedNews: NewsItem[] = [];
    categoryResults.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        collectedNews.push(...result.value);
      } else {
        console.error(`[App] News category ${categories[idx]?.key} failed:`, result.reason);
      }
    });

    // Intel (uses different source - defense/military news)
    {
      const enabledIntelSources = INTEL_SOURCES.filter(f => !this.disabledSources.has(f.name));
      const intelPanel = this.newsPanels['intel'];
      if (enabledIntelSources.length === 0) {
        delete this.newsByCategory['intel'];
        if (intelPanel) intelPanel.showError(t('common.allIntelSourcesDisabled'));
        this.statusPanel?.updateFeed('Intel', { status: 'ok', itemCount: 0 });
      } else {
        const intelResult = await Promise.allSettled([fetchCategoryFeeds(enabledIntelSources)]);
        if (intelResult[0]?.status === 'fulfilled') {
          const intel = intelResult[0].value;
          this.renderNewsForCategory('intel', intel);
          if (intelPanel) {
            try {
              const baseline = await updateBaseline('news:intel', intel.length);
              const deviation = calculateDeviation(intel.length, baseline);
              intelPanel.setDeviation(deviation.zScore, deviation.percentChange, deviation.level);
            } catch (e) { console.warn('[Baseline] news:intel write failed:', e); }
          }
          this.statusPanel?.updateFeed('Intel', { status: 'ok', itemCount: intel.length });
          collectedNews.push(...intel);
          this.flashMapForNews(intel);
        } else {
          delete this.newsByCategory['intel'];
          console.error('[App] Intel feed failed:', intelResult[0]?.reason);
        }
      }
    }

    this.allNews = collectedNews;
    this.initialLoadComplete = true;
    // maybeShowDownloadBanner();
    // mountCommunityWidget();
    // Temporal baseline: report news volume
    updateAndCheck([
      { type: 'news', region: 'global', count: collectedNews.length },
    ]).then(anomalies => {
      if (anomalies.length > 0) signalAggregator.ingestTemporalAnomalies(anomalies);
    }).catch(() => { });

    // Update map hotspots
    this.map?.updateHotspotActivity(this.allNews);

    // Update monitors
    this.updateMonitorResults();

    // Update clusters for correlation analysis (hybrid: semantic + Jaccard when ML available)
    try {
      this.latestClusters = mlWorker.isAvailable
        ? await clusterNewsHybrid(this.allNews)
        : await analysisWorker.clusterNews(this.allNews);

      // Update AI Insights panel with new clusters (if ML available)
      if (mlWorker.isAvailable && this.latestClusters.length > 0) {
        const insightsPanel = this.panels['insights'] as InsightsPanel | undefined;
        insightsPanel?.updateInsights(this.latestClusters);
      }

      // Push geo-located news clusters to map
      const geoLocated = this.latestClusters
        .filter((c): c is typeof c & { lat: number; lon: number } => c.lat != null && c.lon != null)
        .map(c => ({
          lat: c.lat,
          lon: c.lon,
          title: c.primaryTitle,
          threatLevel: c.threat?.level ?? 'info',
          timestamp: c.lastUpdated,
        }));
      if (geoLocated.length > 0) {
        this.map?.setNewsLocations(geoLocated);
      }
    } catch (error) {
      console.error('[App] Clustering failed, clusters unchanged:', error);
    }
  }

  private async loadMarkets(): Promise<void> {
    try {
      const stocksResult = await fetchMultipleStocks(MARKET_SYMBOLS, {
        onBatch: (partialStocks) => {
          this.latestMarkets = partialStocks;
          (this.panels['markets'] as MarketPanel).renderMarkets(partialStocks);
        },
      });

      const finnhubConfigMsg = 'FINNHUB_API_KEY not configured — add in Settings';
      this.latestMarkets = stocksResult.data;
      (this.panels['markets'] as MarketPanel).renderMarkets(stocksResult.data);

      if (stocksResult.skipped) {
        this.statusPanel?.updateApi('Finnhub', { status: 'error' });
        if (stocksResult.data.length === 0) {
          this.panels['markets']?.showConfigError(finnhubConfigMsg);
        }
      } else {
        this.statusPanel?.updateApi('Finnhub', { status: 'ok' });
      }
    } catch {
      this.statusPanel?.updateApi('Finnhub', { status: 'error' });
    }
  }

  private async loadPredictions(): Promise<void> {
    // PredictionPanel (polymarket) removed — map-centered layout
    return;
  }

  private async loadNatural(): Promise<void> {
    // Load both USGS earthquakes and NASA EONET natural events in parallel
    const [earthquakeResult, eonetResult] = await Promise.allSettled([
      fetchEarthquakes(),
      fetchNaturalEvents(30),
    ]);

    // Handle earthquakes (USGS)
    if (earthquakeResult.status === 'fulfilled') {
      this.intelligenceCache.earthquakes = earthquakeResult.value;
      this.map?.setEarthquakes(earthquakeResult.value);
      ingestEarthquakes(earthquakeResult.value);
      this.statusPanel?.updateApi('USGS', { status: 'ok' });
      dataFreshness.recordUpdate('usgs', earthquakeResult.value.length);
    } else {
      this.intelligenceCache.earthquakes = [];
      this.map?.setEarthquakes([]);
      this.statusPanel?.updateApi('USGS', { status: 'error' });
      dataFreshness.recordError('usgs', String(earthquakeResult.reason));
    }

    // Handle natural events (EONET - storms, fires, volcanoes, etc.)
    if (eonetResult.status === 'fulfilled') {
      this.map?.setNaturalEvents(eonetResult.value);
      this.statusPanel?.updateFeed('EONET', {
        status: 'ok',
        itemCount: eonetResult.value.length,
      });
      this.statusPanel?.updateApi('NASA EONET', { status: 'ok' });
    } else {
      this.map?.setNaturalEvents([]);
      this.statusPanel?.updateFeed('EONET', { status: 'error', errorMessage: String(eonetResult.reason) });
      this.statusPanel?.updateApi('NASA EONET', { status: 'error' });
    }

    // Set layer ready based on combined data
    const hasEarthquakes = earthquakeResult.status === 'fulfilled' && earthquakeResult.value.length > 0;
    const hasEonet = eonetResult.status === 'fulfilled' && eonetResult.value.length > 0;
    this.map?.setLayerReady('natural', hasEarthquakes || hasEonet);
  }

  private async loadWeatherAlerts(): Promise<void> {
    try {
      const alerts = await fetchWeatherAlerts();
      this.map?.setWeatherAlerts(alerts);
      this.map?.setLayerReady('weather', alerts.length > 0);
      this.statusPanel?.updateFeed('Weather', { status: 'ok', itemCount: alerts.length });
      dataFreshness.recordUpdate('weather', alerts.length);
    } catch (error) {
      this.map?.setLayerReady('weather', false);
      this.statusPanel?.updateFeed('Weather', { status: 'error' });
      dataFreshness.recordError('weather', String(error));
    }
  }

  // Cache for intelligence data - allows CII to work even when layers are disabled
  private intelligenceCache: {
    outages?: InternetOutage[];
    protests?: { events: SocialUnrestEvent[]; sources: { acled: number; gdelt: number } };
    earthquakes?: import('@/services/earthquakes').Earthquake[];
  } = {};
  private cyberThreatsCache: CyberThreat[] | null = null;

  /**
   * Load intelligence-critical signals for CII/focal point calculation
   * This runs ALWAYS, regardless of layer visibility
   * Map rendering is separate and still gated by layer visibility
   */
  private async loadIntelligenceSignals(): Promise<void> {
    const tasks: Promise<void>[] = [];

    // Always fetch outages for CII (internet blackouts = major instability signal)
    tasks.push((async () => {
      try {
        const outages = await fetchInternetOutages();
        this.intelligenceCache.outages = outages;
        ingestOutagesForCII(outages);
        signalAggregator.ingestOutages(outages);
        dataFreshness.recordUpdate('outages', outages.length);
        // Update map only if layer is visible
        if (this.mapLayers.outages) {
          this.map?.setOutages(outages);
          this.map?.setLayerReady('outages', outages.length > 0);
          this.statusPanel?.updateFeed('NetBlocks', { status: 'ok', itemCount: outages.length });
        }
      } catch (error) {
        console.error('[Intelligence] Outages fetch failed:', error);
        dataFreshness.recordError('outages', String(error));
      }
    })());

    // Protest fetch service removed — supply empty events for downstream consumers
    const protestsTask = Promise.resolve([] as SocialUnrestEvent[]);
    tasks.push(protestsTask.then(() => undefined));


    // Fetch climate anomalies (temperature/precipitation deviations)
    tasks.push((async () => {
      try {
        const climateResult = await fetchClimateAnomalies();
        if (!climateResult.ok) {
          dataFreshness.recordError('climate', 'Climate anomalies unavailable (retaining prior climate state)');
          return;
        }
        const anomalies = climateResult.anomalies;
        (this.panels['climate'] as ClimateAnomalyPanel)?.setAnomalies(anomalies);
        ingestClimateForCII(anomalies);
        if (this.mapLayers.climate) {
          this.map?.setClimateAnomalies(anomalies);
        }
        if (anomalies.length > 0) dataFreshness.recordUpdate('climate', anomalies.length);
      } catch (error) {
        console.error('[Intelligence] Climate anomalies fetch failed:', error);
        dataFreshness.recordError('climate', String(error));
      }
    })());

    await Promise.allSettled(tasks);

    // Now trigger CII refresh with all intelligence data
    // CII panel removed - risk-overview handles this now
    console.log('[Intelligence] All signals loaded for CII calculation');
  }

  private async loadOutages(): Promise<void> {
    // Use cached data if available
    if (this.intelligenceCache.outages) {
      const outages = this.intelligenceCache.outages;
      this.map?.setOutages(outages);
      this.map?.setLayerReady('outages', outages.length > 0);
      this.statusPanel?.updateFeed('NetBlocks', { status: 'ok', itemCount: outages.length });
      return;
    }
    try {
      const outages = await fetchInternetOutages();
      this.intelligenceCache.outages = outages;
      this.map?.setOutages(outages);
      this.map?.setLayerReady('outages', outages.length > 0);
      ingestOutagesForCII(outages);
      signalAggregator.ingestOutages(outages);
      this.statusPanel?.updateFeed('NetBlocks', { status: 'ok', itemCount: outages.length });
      dataFreshness.recordUpdate('outages', outages.length);
    } catch (error) {
      this.map?.setLayerReady('outages', false);
      this.statusPanel?.updateFeed('NetBlocks', { status: 'error' });
      dataFreshness.recordError('outages', String(error));
    }
  }

  private async loadCyberThreats(): Promise<void> {
    if (!CYBER_LAYER_ENABLED) {
      this.mapLayers.cyberThreats = false;
      this.map?.setLayerReady('cyberThreats', false);
      return;
    }

    if (this.cyberThreatsCache) {
      this.map?.setCyberThreats(this.cyberThreatsCache);
      this.map?.setLayerReady('cyberThreats', this.cyberThreatsCache.length > 0);
      this.statusPanel?.updateFeed('Cyber Threats', { status: 'ok', itemCount: this.cyberThreatsCache.length });
      return;
    }

    try {
      const threats = await fetchCyberThreats({ limit: 500, days: 14 });
      this.cyberThreatsCache = threats;
      this.map?.setCyberThreats(threats);
      this.map?.setLayerReady('cyberThreats', threats.length > 0);
      this.statusPanel?.updateFeed('Cyber Threats', { status: 'ok', itemCount: threats.length });
      this.statusPanel?.updateApi('Cyber Threats API', { status: 'ok' });
      dataFreshness.recordUpdate('cyber_threats', threats.length);
    } catch (error) {
      this.map?.setLayerReady('cyberThreats', false);
      this.statusPanel?.updateFeed('Cyber Threats', { status: 'error', errorMessage: String(error) });
      this.statusPanel?.updateApi('Cyber Threats API', { status: 'error' });
      dataFreshness.recordError('cyber_threats', String(error));
    }
  }

  private async loadFredData(): Promise<void> {
    const economicPanel = this.panels['economic'] as EconomicPanel;
    const cbInfo = getCircuitBreakerCooldownInfo('FRED Economic');
    if (cbInfo.onCooldown) {
      economicPanel?.setErrorState(true, `Temporarily unavailable (retry in ${cbInfo.remainingSeconds}s)`);
      this.statusPanel?.updateApi('FRED', { status: 'error' });
      return;
    }

    try {
      economicPanel?.setLoading(true);
      const data = await fetchFredData();

      // Check if circuit breaker tripped after fetch
      const postInfo = getCircuitBreakerCooldownInfo('FRED Economic');
      if (postInfo.onCooldown) {
        economicPanel?.setErrorState(true, `Temporarily unavailable (retry in ${postInfo.remainingSeconds}s)`);
        this.statusPanel?.updateApi('FRED', { status: 'error' });
        return;
      }

      if (data.length === 0) {
        if (!isFeatureAvailable('economicFred')) {
          economicPanel?.setErrorState(true, 'FRED_API_KEY not configured — add in Settings');
          this.statusPanel?.updateApi('FRED', { status: 'error' });
          return;
        }
        // Transient failure — quick retry once
        economicPanel?.showRetrying();
        await new Promise(r => setTimeout(r, 20_000));
        const retryData = await fetchFredData();
        if (retryData.length === 0) {
          economicPanel?.setErrorState(true, 'FRED data temporarily unavailable — will retry');
          this.statusPanel?.updateApi('FRED', { status: 'error' });
          return;
        }
        economicPanel?.setErrorState(false);
        economicPanel?.update(retryData);
        this.statusPanel?.updateApi('FRED', { status: 'ok' });
        dataFreshness.recordUpdate('economic', retryData.length);
        return;
      }

      economicPanel?.setErrorState(false);
      economicPanel?.update(data);
      this.statusPanel?.updateApi('FRED', { status: 'ok' });
      dataFreshness.recordUpdate('economic', data.length);
    } catch {
      if (isFeatureAvailable('economicFred')) {
        economicPanel?.showRetrying();
        try {
          await new Promise(r => setTimeout(r, 20_000));
          const retryData = await fetchFredData();
          if (retryData.length > 0) {
            economicPanel?.setErrorState(false);
            economicPanel?.update(retryData);
            this.statusPanel?.updateApi('FRED', { status: 'ok' });
            dataFreshness.recordUpdate('economic', retryData.length);
            return;
          }
        } catch { /* fall through */ }
      }
      this.statusPanel?.updateApi('FRED', { status: 'error' });
      economicPanel?.setErrorState(true, 'FRED data temporarily unavailable — will retry');
      economicPanel?.setLoading(false);
    }
  }

  private async loadOilAnalytics(): Promise<void> {
    const economicPanel = this.panels['economic'] as EconomicPanel;
    try {
      const data = await fetchOilAnalytics();
      economicPanel?.updateOil(data);
      const hasData = !!(data.wtiPrice || data.brentPrice || data.usProduction || data.usInventory);
      this.statusPanel?.updateApi('EIA', { status: hasData ? 'ok' : 'error' });
      if (hasData) {
        const metricCount = [data.wtiPrice, data.brentPrice, data.usProduction, data.usInventory].filter(Boolean).length;
        dataFreshness.recordUpdate('oil', metricCount || 1);
      } else {
        dataFreshness.recordError('oil', 'Oil analytics returned no values');
      }
    } catch (e) {
      console.error('[App] Oil analytics failed:', e);
      this.statusPanel?.updateApi('EIA', { status: 'error' });
      dataFreshness.recordError('oil', String(e));
    }
  }

  private async loadGovernmentSpending(): Promise<void> {
    const economicPanel = this.panels['economic'] as EconomicPanel;
    try {
      const { fetchItaliaSpending } = await import('@/services/italia-spending');
      const data = await fetchItaliaSpending();
      economicPanel?.updateSpending(data);
      this.statusPanel?.updateApi('USASpending', { status: data.pnrr.milestones.length > 0 ? 'ok' : 'error' });
      if (data.pnrr.milestones.length > 0) {
        dataFreshness.recordUpdate('spending', data.pnrr.milestones.length);
      }
    } catch (e) {
      console.error('[App] Italia spending failed:', e);
      this.statusPanel?.updateApi('USASpending', { status: 'error' });
      dataFreshness.recordError('spending', String(e));
    }
  }

  private updateMonitorResults(): void {
    const monitorPanel = this.panels['monitors'] as MonitorPanel;
    monitorPanel.renderResults(this.allNews);
  }

  private async loadFirmsData(): Promise<void> {
    try {
      const fireResult = await fetchAllFires(1);
      if (fireResult.skipped) {
        this.panels['satellite-fires']?.showConfigError('NASA_FIRMS_API_KEY not configured — add in Settings');
        this.statusPanel?.updateApi('FIRMS', { status: 'error' });
        return;
      }
      const { regions, totalCount } = fireResult;
      if (totalCount > 0) {
        const flat = flattenFires(regions);
        const stats = computeRegionStats(regions);

        // Feed signal aggregator
        signalAggregator.ingestSatelliteFires(flat.map(f => ({
          lat: f.location?.latitude ?? 0,
          lon: f.location?.longitude ?? 0,
          brightness: f.brightness,
          frp: f.frp,
          region: f.region,
          acq_date: new Date(f.detectedAt).toISOString().slice(0, 10),
        })));

        // Feed map layer
        this.map?.setFires(toMapFires(flat));

        // Feed panel
        (this.panels['satellite-fires'] as SatelliteFiresPanel)?.update(stats, totalCount);

        dataFreshness.recordUpdate('firms', totalCount);

        // Report to temporal baseline (fire-and-forget)
        updateAndCheck([
          { type: 'satellite_fires', region: 'global', count: totalCount },
        ]).then(anomalies => {
          if (anomalies.length > 0) {
            signalAggregator.ingestTemporalAnomalies(anomalies);
          }
        }).catch(() => { });
      } else {
        // Still update panel so it exits loading spinner
        (this.panels['satellite-fires'] as SatelliteFiresPanel)?.update([], 0);
      }
      this.statusPanel?.updateApi('FIRMS', { status: 'ok' });
    } catch (e) {
      console.warn('[App] FIRMS load failed:', e);
      (this.panels['satellite-fires'] as SatelliteFiresPanel)?.update([], 0);
      this.statusPanel?.updateApi('FIRMS', { status: 'error' });
      dataFreshness.recordError('firms', String(e));
    }
  }

  private scheduleRefresh(
    name: string,
    fn: () => Promise<void>,
    intervalMs: number,
    condition?: () => boolean
  ): void {
    const HIDDEN_REFRESH_MULTIPLIER = 4;
    const JITTER_FRACTION = 0.1;
    const MIN_REFRESH_MS = 1000;
    const computeDelay = (baseMs: number, isHidden: boolean) => {
      const adjusted = baseMs * (isHidden ? HIDDEN_REFRESH_MULTIPLIER : 1);
      const jitterRange = adjusted * JITTER_FRACTION;
      const jittered = adjusted + (Math.random() * 2 - 1) * jitterRange;
      return Math.max(MIN_REFRESH_MS, Math.round(jittered));
    };
    const scheduleNext = (delay: number) => {
      if (this.isDestroyed) return;
      const timeoutId = setTimeout(run, delay);
      this.refreshTimeoutIds.set(name, timeoutId);
    };
    const run = async () => {
      if (this.isDestroyed) return;
      const isHidden = document.visibilityState === 'hidden';
      if (isHidden) {
        scheduleNext(computeDelay(intervalMs, true));
        return;
      }
      if (condition && !condition()) {
        scheduleNext(computeDelay(intervalMs, false));
        return;
      }
      if (this.inFlight.has(name)) {
        scheduleNext(computeDelay(intervalMs, false));
        return;
      }
      this.inFlight.add(name);
      try {
        await fn();
      } catch (e) {
        console.error(`[App] Refresh ${name} failed:`, e);
      } finally {
        this.inFlight.delete(name);
        scheduleNext(computeDelay(intervalMs, false));
      }
    };
    scheduleNext(computeDelay(intervalMs, document.visibilityState === 'hidden'));
  }

  private setupRefreshIntervals(): void {
    // Always refresh news, markets, predictions, pizzint
    this.scheduleRefresh('news', () => this.loadNews(), REFRESH_INTERVALS.feeds);
    this.scheduleRefresh('markets', () => this.loadMarkets(), REFRESH_INTERVALS.markets);
    this.scheduleRefresh('predictions', () => this.loadPredictions(), REFRESH_INTERVALS.predictions);
    this.scheduleRefresh('pizzint', () => this.loadPizzInt(), 10 * 60 * 1000);

    // Only refresh layer data if layer is enabled
    this.scheduleRefresh('natural', () => this.loadNatural(), 5 * 60 * 1000, () => this.mapLayers.natural);
    this.scheduleRefresh('weather', () => this.loadWeatherAlerts(), 10 * 60 * 1000, () => this.mapLayers.weather);
    this.scheduleRefresh('fred', () => this.loadFredData(), 30 * 60 * 1000);
    this.scheduleRefresh('oil', () => this.loadOilAnalytics(), 30 * 60 * 1000);
    this.scheduleRefresh('spending', () => this.loadGovernmentSpending(), 60 * 60 * 1000);

    // Refresh intelligence signals for CII
    // This handles outages, protests - updates map when layers enabled
    this.scheduleRefresh('intelligence', () => {
      this.intelligenceCache = {}; // Clear cache to force fresh fetch
      return this.loadIntelligenceSignals();
    }, 5 * 60 * 1000);

    // Non-intelligence layer refreshes only
    this.scheduleRefresh('firms', () => this.loadFirmsData(), 30 * 60 * 1000);
    this.scheduleRefresh('cyberThreats', () => {
      this.cyberThreatsCache = null;
      return this.loadCyberThreats();
    }, 10 * 60 * 1000, () => CYBER_LAYER_ENABLED && this.mapLayers.cyberThreats);
  }
}
