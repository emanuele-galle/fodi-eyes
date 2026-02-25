import type { ViewController } from './ViewController';
import type { Panel } from '@/components/Panel';
import type { MapContainer } from '@/components/MapContainer';
import {
  LiveNewsPanel,
  TerritorialWebcamsPanel,
  TrafficWebcamsPanel,
  ItaliaDataPanel,
  PoliticsItalyPanel,
  OpenDataPanel,
  EntitySearchPanel,
  InsightsPanel,
  MonitorPanel,
  OsintArsenalPanel,
  Sidebar,
} from '@/components';
import type { TabConfig } from '@/components';
import { t as _t } from '@/services/i18n';

export class ItaliaView implements ViewController {
  private element: HTMLElement;
  private sidebar: Sidebar;
  private panels: Record<string, Panel> = {};
  private map: MapContainer | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'view-container italia-view';
    this.element.id = 'italiaView';

    // Create sidebar with Italian-focused tabs
    const italianTabs: TabConfig[] = [
      { id: 'webcam', label: 'Webcam', icon: '\u{1F4F7}', tooltip: 'Webcam territoriali in tempo reale' },
      { id: 'news', label: 'News', icon: '\u{1F4F0}', tooltip: 'Notizie Italia in tempo reale' },
      { id: 'dati', label: 'Dati', icon: '\u{1F4CA}', tooltip: 'Open Data, mercati e politica' },
      { id: 'intel', label: 'Intel', icon: '\u{1F50D}', tooltip: 'Intelligence: entit\u00E0, insights e monitor' },
      { id: 'tools', label: 'Tools', icon: '\u{1F6E0}', tooltip: 'OSINT Arsenal e strumenti investigativi' },
    ];

    this.sidebar = new Sidebar(italianTabs);

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

    const webcamPanel = this.panels['webcam-territoriali'] as TerritorialWebcamsPanel;
    webcamPanel?.setWebcamSelectHandler((webcam) => {
      this.map?.setCenter(webcam.lat, webcam.lon, 12);
    });

    const trafficPanel = this.panels['traffic-webcams'] as TrafficWebcamsPanel;
    trafficPanel?.setWebcamSelectHandler((lat, lon) => {
      this.map?.setCenter(lat, lon, 10);
    });
  }

  private createPanels(): void {
    // === TAB: Webcam (default landing tab) ===
    const webcamPanel = new TerritorialWebcamsPanel();
    this.panels['webcam-territoriali'] = webcamPanel;

    const trafficPanel = new TrafficWebcamsPanel();
    this.panels['traffic-webcams'] = trafficPanel;

    // === TAB: News ===
    const liveNewsPanel = new LiveNewsPanel({ italiaOnly: true });
    this.panels['live-news'] = liveNewsPanel;

    // === TAB: Dati (Open Data, Markets, Politics) ===
    const italiaDataPanel = new ItaliaDataPanel();
    this.panels['italia-data'] = italiaDataPanel;

    const openDataPanel = new OpenDataPanel();
    this.panels['open-data'] = openDataPanel;

    const politicsItalyPanel = new PoliticsItalyPanel();
    this.panels['politics-italy'] = politicsItalyPanel;

    // === TAB: Intel (Entity Search + Insights + Monitor) ===
    const entitySearchPanel = new EntitySearchPanel();
    this.panels['entity-search'] = entitySearchPanel;

    const insightsPanel = new InsightsPanel();
    this.panels['insights'] = insightsPanel;

    const monitorPanel = new MonitorPanel();
    this.panels['monitors'] = monitorPanel;

    // === TAB: Tools (OSINT Arsenal) ===
    const osintArsenalPanel = new OsintArsenalPanel();
    this.panels['osint-arsenal'] = osintArsenalPanel;

    // Register panels in sidebar tabs
    this.sidebar.registerPanels('webcam', [webcamPanel, trafficPanel]);
    this.sidebar.registerPanels('news', [liveNewsPanel]);
    this.sidebar.registerPanels('dati', [italiaDataPanel, openDataPanel, politicsItalyPanel]);
    this.sidebar.registerPanels('intel', [entitySearchPanel, insightsPanel, monitorPanel]);
    this.sidebar.registerPanels('tools', [osintArsenalPanel]);
  }

  getPanel(key: string): Panel | undefined {
    return this.panels[key];
  }

  getSidebar(): Sidebar {
    return this.sidebar;
  }

  activate(): void {
    this.element.classList.add('active');
    // Center map on Italy
    this.map?.setCenter(42.5, 12.5, 5.5);
  }

  deactivate(): void {
    this.element.classList.remove('active');
  }

  destroy(): void {
    this.sidebar.destroy();
  }

  getElement(): HTMLElement {
    return this.element;
  }
}
