import type { NewsItem, MapLayers, MarketData, ClusteredEvent } from '@/types';
import type { PredictionMarket } from '@/services/prediction';

type StateKey = 'allNews' | 'newsByCategory' | 'mapLayers' | 'monitors' | 'latestMarkets' | 'latestClusters' | 'latestPredictions' | 'disabledSources';

type StateSlice = {
  allNews: NewsItem[];
  newsByCategory: Record<string, NewsItem[]>;
  mapLayers: MapLayers;
  monitors: unknown[];
  latestMarkets: MarketData[];
  latestClusters: ClusteredEvent[];
  latestPredictions: PredictionMarket[];
  disabledSources: Set<string>;
};

type Listener<K extends StateKey> = (value: StateSlice[K]) => void;

class AppStateClass {
  private state: StateSlice = {
    allNews: [],
    newsByCategory: {},
    mapLayers: {} as MapLayers,
    monitors: [],
    latestMarkets: [],
    latestClusters: [],
    latestPredictions: [],
    disabledSources: new Set(),
  };

  private listeners: Map<StateKey, Set<Listener<any>>> = new Map();

  get<K extends StateKey>(key: K): StateSlice[K] {
    return this.state[key];
  }

  set<K extends StateKey>(key: K, value: StateSlice[K]): void {
    this.state[key] = value;
    this.notify(key);
  }

  subscribe<K extends StateKey>(key: K, fn: Listener<K>): () => void {
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key)!.add(fn);
    return () => {
      this.listeners.get(key)?.delete(fn);
    };
  }

  private notify(key: StateKey): void {
    const fns = this.listeners.get(key);
    if (!fns) return;
    const value = this.state[key];
    for (const fn of fns) {
      try { fn(value); } catch (e) { console.error(`[AppState] listener error for ${key}:`, e); }
    }
  }
}

export const appState = new AppStateClass();
