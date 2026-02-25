/**
 * Italian Politics Intelligence service
 * Fetches RSS from Camera, Senato, and polling data
 */

export interface PoliticsItem {
  title: string;
  link: string;
  source: string;
  pubDate: string;
  category?: string;
}

export interface PollData {
  party: string;
  percentage: number;
  color: string;
  trend: 'up' | 'down' | 'stable';
}

// Static polling data — updated periodically from aggregators
// Source: YouTrend, Termometro Politico, SWG
export function getLatestPolls(): PollData[] {
  return [
    { party: 'FdI', percentage: 28.2, color: '#003DA5', trend: 'stable' },
    { party: 'PD', percentage: 23.1, color: '#E30613', trend: 'up' },
    { party: 'M5S', percentage: 11.5, color: '#FFD700', trend: 'down' },
    { party: 'Forza Italia', percentage: 9.2, color: '#0087DC', trend: 'stable' },
    { party: 'Lega', percentage: 8.4, color: '#008C45', trend: 'down' },
    { party: 'AVS', percentage: 6.8, color: '#4CAF50', trend: 'up' },
    { party: 'Azione', percentage: 3.2, color: '#FF6600', trend: 'down' },
    { party: 'Italia Viva', percentage: 2.5, color: '#E91E63', trend: 'stable' },
    { party: 'Altri', percentage: 7.1, color: '#9E9E9E', trend: 'stable' },
  ];
}

const RSS_PROXY = '/api/rss-proxy';

async function fetchRssItems(feedUrl: string, source: string): Promise<PoliticsItem[]> {
  try {
    const proxyUrl = `${RSS_PROXY}?url=${encodeURIComponent(feedUrl)}`;
    const response = await fetch(proxyUrl);
    if (!response.ok) return [];

    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'text/xml');
    const items = doc.querySelectorAll('item');

    const results: PoliticsItem[] = [];
    items.forEach((item, i) => {
      if (i >= 10) return; // Max 10 per source
      const title = item.querySelector('title')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const pubDate = item.querySelector('pubDate')?.textContent?.trim() || '';
      const category = item.querySelector('category')?.textContent?.trim();
      if (title) {
        results.push({ title, link, source, pubDate, category });
      }
    });
    return results;
  } catch {
    return [];
  }
}

export async function fetchCameraNews(): Promise<PoliticsItem[]> {
  return fetchRssItems('https://www.camera.it/leg19/rss/rss.html', 'Camera dei Deputati');
}

export async function fetchSenatoNews(): Promise<PoliticsItem[]> {
  return fetchRssItems('https://www.senato.it/rss/stampa.xml', 'Senato');
}

export async function fetchPoliticalNews(): Promise<PoliticsItem[]> {
  // Use ANSA politica RSS
  return fetchRssItems('https://www.ansa.it/sito/notizie/politica/politica_rss.xml', 'ANSA Politica');
}

export async function fetchAllPoliticsData(): Promise<{
  polls: PollData[];
  parlamento: PoliticsItem[];
  news: PoliticsItem[];
}> {
  const [camera, senato, news] = await Promise.allSettled([
    fetchCameraNews(),
    fetchSenatoNews(),
    fetchPoliticalNews(),
  ]);

  const parlamento = [
    ...(camera.status === 'fulfilled' ? camera.value : []),
    ...(senato.status === 'fulfilled' ? senato.value : []),
  ].sort((a, b) => new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime());

  return {
    polls: getLatestPolls(),
    parlamento,
    news: news.status === 'fulfilled' ? news.value : [],
  };
}
