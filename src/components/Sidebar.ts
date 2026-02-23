import type { Panel } from './Panel';

export type SidebarTab = 'news' | 'webcam' | 'intel' | 'dati' | 'tools';

interface TabConfig {
  id: SidebarTab;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'news', label: 'News', icon: '\u{1F4F0}' },
  { id: 'webcam', label: 'Webcam', icon: '\u{1F4F7}' },
  { id: 'intel', label: 'Intel', icon: '\u{1F50D}' },
  { id: 'dati', label: 'Dati', icon: '\u{1F4CA}' },
  { id: 'tools', label: 'Tools', icon: '\u{1F6E0}' },
];

export class Sidebar {
  private element: HTMLElement;
  private tabsEl: HTMLElement;
  private contentEl: HTMLElement;
  private activeTab: SidebarTab = 'news';
  private collapsed = false;
  private tabPanels: Map<SidebarTab, Panel[]> = new Map();

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'sidebar';
    this.element.id = 'sidebar';

    // Tabs bar
    this.tabsEl = document.createElement('div');
    this.tabsEl.className = 'sidebar-tabs';

    // Content area
    this.contentEl = document.createElement('div');
    this.contentEl.className = 'sidebar-content';

    this.element.appendChild(this.tabsEl);
    this.element.appendChild(this.contentEl);

    this.renderTabs();
  }

  private renderTabs(): void {
    this.tabsEl.innerHTML = '';

    for (const tab of TABS) {
      const btn = document.createElement('button');
      btn.className = `sidebar-tab${tab.id === this.activeTab ? ' active' : ''}`;
      btn.dataset.tab = tab.id;
      btn.title = tab.label;

      const icon = document.createElement('span');
      icon.className = 'sidebar-tab-icon';
      icon.textContent = tab.icon;

      const label = document.createElement('span');
      label.className = 'sidebar-tab-label';
      label.textContent = tab.label;

      btn.appendChild(icon);
      btn.appendChild(label);

      btn.addEventListener('click', () => this.setActiveTab(tab.id));
      this.tabsEl.appendChild(btn);
    }
  }

  registerPanels(tab: SidebarTab, panels: Panel[]): void {
    this.tabPanels.set(tab, panels);
    // If this is the active tab, render immediately
    if (tab === this.activeTab) {
      this.renderContent();
    }
  }

  setActiveTab(tab: SidebarTab): void {
    if (tab === this.activeTab) return;
    this.activeTab = tab;

    // Update tab button active states
    this.tabsEl.querySelectorAll('.sidebar-tab').forEach((btn) => {
      const el = btn as HTMLElement;
      el.classList.toggle('active', el.dataset.tab === tab);
    });

    this.renderContent();
  }

  getActiveTab(): SidebarTab {
    return this.activeTab;
  }

  private renderContent(): void {
    // Clear content
    this.contentEl.innerHTML = '';

    const panels = this.tabPanels.get(this.activeTab);
    if (!panels || panels.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'sidebar-empty';
      empty.textContent = 'Nessun pannello disponibile';
      this.contentEl.appendChild(empty);
      return;
    }

    for (const panel of panels) {
      this.contentEl.appendChild(panel.getElement());
    }
  }

  toggle(): void {
    this.collapsed = !this.collapsed;
    this.element.classList.toggle('collapsed', this.collapsed);
  }

  isCollapsed(): boolean {
    return this.collapsed;
  }

  getElement(): HTMLElement {
    return this.element;
  }

  destroy(): void {
    // Destroy all registered panels
    for (const panels of this.tabPanels.values()) {
      for (const panel of panels) {
        panel.destroy();
      }
    }
    this.tabPanels.clear();
  }
}
