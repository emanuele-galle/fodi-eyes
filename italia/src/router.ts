export type ViewRoute = 'italia' | 'mondo' | 'osint';

interface RouteHandler {
  activate(): void;
  deactivate(): void;
}

export class Router {
  private routes: Map<ViewRoute, RouteHandler> = new Map();
  private currentRoute: ViewRoute | null = null;
  private listeners: Array<(route: ViewRoute) => void> = [];

  constructor() {
    window.addEventListener('hashchange', () => this.handleHashChange());
  }

  register(route: ViewRoute, handler: RouteHandler): void {
    this.routes.set(route, handler);
  }

  navigate(route: ViewRoute): void {
    // Preserve existing query params
    const url = new URL(window.location.href);
    url.hash = `/${route}`;
    window.history.pushState(null, '', url.toString());
    this.handleHashChange();
  }

  start(): void {
    this.handleHashChange();
  }

  getCurrentRoute(): ViewRoute | null {
    return this.currentRoute;
  }

  onChange(fn: (route: ViewRoute) => void): void {
    this.listeners.push(fn);
  }

  private handleHashChange(): void {
    const hash = window.location.hash.replace(/^#\/?/, '') || 'italia';
    const route = this.parseRoute(hash);

    if (route === this.currentRoute) return;

    // Deactivate current
    if (this.currentRoute) {
      this.routes.get(this.currentRoute)?.deactivate();
    }

    // Activate new
    this.currentRoute = route;
    this.routes.get(route)?.activate();

    // Notify listeners
    for (const fn of this.listeners) {
      fn(route);
    }
  }

  private parseRoute(hash: string): ViewRoute {
    const normalized = hash.toLowerCase().trim();
    if (normalized === 'mondo' || normalized === 'world') return 'mondo';
    if (normalized === 'osint' || normalized === 'scanner') return 'osint';
    return 'italia';
  }

  destroy(): void {
    // no-op: hashchange listener can't be easily removed without stored ref;
    // in practice Router lives for the entire app lifecycle
  }
}
