import type { ViewRoute } from '@/router';

interface TabDef {
  route: ViewRoute;
  label: string;
  icon: string;
}

const HEADER_TABS: TabDef[] = [
  { route: 'italia', label: 'Italia', icon: '\u{1F1EE}\u{1F1F9}' },
  { route: 'mondo', label: 'Mondo', icon: '\u{1F30D}' },
  { route: 'osint', label: 'OSINT', icon: '\u{1F50D}' },
];

export class HeaderTabs {
  private element: HTMLElement;
  private onNavigate: ((route: ViewRoute) => void) | null = null;

  constructor() {
    this.element = document.createElement('div');
    this.element.className = 'header-tabs';
    this.render('italia');
  }

  setNavigateHandler(fn: (route: ViewRoute) => void): void {
    this.onNavigate = fn;
  }

  setActive(route: ViewRoute): void {
    this.element.querySelectorAll('.header-tab').forEach((btn) => {
      const el = btn as HTMLElement;
      const isActive = el.dataset.route === route;
      el.classList.toggle('active', isActive);
      // Remove all view-specific active classes first
      el.classList.remove('active-italia', 'active-mondo', 'active-osint');
      // Add the correct view-specific class when active
      if (isActive) {
        el.classList.add(`active-${route}`);
      }
    });
  }

  getElement(): HTMLElement {
    return this.element;
  }

  private render(activeRoute: ViewRoute): void {
    this.element.innerHTML = '';

    for (const tab of HEADER_TABS) {
      const btn = document.createElement('button');
      const activeClass = tab.route === activeRoute ? ` active active-${tab.route}` : '';
      btn.className = `header-tab${activeClass}`;
      btn.dataset.route = tab.route;
      btn.dataset.view = tab.route;

      const icon = document.createElement('span');
      icon.className = 'header-tab-icon';
      icon.textContent = tab.icon;

      const label = document.createElement('span');
      label.className = 'header-tab-label';
      label.textContent = tab.label;

      btn.appendChild(icon);
      btn.appendChild(label);

      btn.addEventListener('click', () => {
        this.onNavigate?.(tab.route);
      });

      this.element.appendChild(btn);
    }
  }
}
