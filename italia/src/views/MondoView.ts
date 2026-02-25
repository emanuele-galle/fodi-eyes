import type { ViewController } from './ViewController';
import type { Panel } from '@/components/Panel';
import type { MapContainer } from '@/components/MapContainer';
import {
  NewsPanel,
  MarketPanel,
  MonitorPanel,
  EconomicPanel,
  InsightsPanel,
  LiveNewsPanel,
  TerritorialWebcamsPanel,
  ServiceStatusPanel,
  SatelliteFiresPanel,
  ClimateAnomalyPanel,
  // RuntimeConfigPanel,
  OsintArsenalPanel,
  ItaliaDataPanel,
  PoliticsItalyPanel,
  OpenDataPanel,
  EntitySearchPanel,
  Sidebar,
  // type SidebarTab,
} from '@/components';
import { STORAGE_KEYS } from '@/config';
// import { isDesktopRuntime } from '@/services/runtime';
import { loadFromStorage, saveToStorage } from '@/utils';
import type { Monitor } from '@/types';
import { t } from '@/services/i18n';

export class MondoView implements ViewController {
  private element: HTMLElement;
  private sidebar: Sidebar;
  private panels: Record<string, Panel> = {};
  private newsPanels: Record<string, NewsPanel> = {};
  private map: MapContainer | null = null;
  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'view-container mondo-view';
    this.element.id = 'mondoView';

    // Create sidebar
    this.sidebar = new Sidebar();
    this.createPanels();

    // Add sidebar toggle
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sidebar-toggle';
    toggleBtn.textContent = '\u25C0';
    toggleBtn.addEventListener('click', () => {
      this.sidebar.toggle();
      toggleBtn.textContent = this.sidebar.isCollapsed() ? '\u25B6' : '\u25C0';
    });

    this.element.appendChild(toggleBtn);
    this.element.appendChild(this.sidebar.getElement());
  }

  setMap(map: MapContainer): void {
    this.map = map;

    // Connect webcam panel to map
    const webcamPanel = this.panels['webcam-territoriali'] as TerritorialWebcamsPanel;
    webcamPanel?.setWebcamSelectHandler((webcam) => {
      this.map?.setCenter(webcam.lat, webcam.lon, 12);
    });

    // Climate zone click
    const climatePanel = this.panels['climate'] as ClimateAnomalyPanel;
    climatePanel?.setZoneClickHandler((lat, lon) => {
      this.map?.setCenter(lat, lon, 4);
    });
  }

  private createPanels(): void {
    const monitors = loadFromStorage<Monitor[]>(STORAGE_KEYS.monitors, []);

    // === TAB: News ===
    const liveNewsPanel = new LiveNewsPanel();
    this.panels['live-news'] = liveNewsPanel;

    const categories = ['politics', 'intel', 'gov', 'thinktanks', 'energy', 'tech', 'ai'];
    for (const cat of categories) {
      const panel = new NewsPanel(cat, t(`panels.${cat}`));
      this.newsPanels[cat] = panel;
      this.panels[cat] = panel;
    }

    // === TAB: Webcam ===
    const webcamPanel = new TerritorialWebcamsPanel();
    this.panels['webcam-territoriali'] = webcamPanel;

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
    const monitorPanel = new MonitorPanel(monitors);
    this.panels['monitors'] = monitorPanel;
    monitorPanel.onChanged((updated) => {
      saveToStorage(STORAGE_KEYS.monitors, updated);
    });

    const serviceStatusPanel = new ServiceStatusPanel();
    this.panels['service-status'] = serviceStatusPanel;

    const satelliteFiresPanel = new SatelliteFiresPanel();
    this.panels['satellite-fires'] = satelliteFiresPanel;

    const climatePanel = new ClimateAnomalyPanel();
    this.panels['climate'] = climatePanel;

    // Register panels in sidebar
    this.sidebar.registerPanels('news', [
      liveNewsPanel,
      ...categories.map(c => this.panels[c]).filter(Boolean) as Panel[],
    ]);
    this.sidebar.registerPanels('webcam', [webcamPanel]);
    this.sidebar.registerPanels('intel', [entitySearchPanel, osintArsenalPanel, insightsPanel]);
    this.sidebar.registerPanels('dati', [italiaDataPanel, openDataPanel, economicPanel, marketsPanel, politicsItalyPanel]);
    this.sidebar.registerPanels('tools', [monitorPanel, serviceStatusPanel, satelliteFiresPanel, climatePanel]);
  }

  getPanel(key: string): Panel | undefined {
    return this.panels[key];
  }

  getNewsPanel(key: string): NewsPanel | undefined {
    return this.newsPanels[key];
  }

  getSidebar(): Sidebar {
    return this.sidebar;
  }

  activate(): void {
    // active
    this.element.classList.add('active');
    // Center map on world
    this.map?.setCenter(20, 0, 1.0);
  }

  deactivate(): void {
    // inactive
    this.element.classList.remove('active');
  }

  destroy(): void {
    this.sidebar.destroy();
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
