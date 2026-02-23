/**
 * CKAN Italia - Search datasets on dati.gov.it
 * Uses the proxy /api/ckan → dati.gov.it CKAN API
 */

export interface CKANResource {
  id: string;
  name: string;
  format: string;
  url: string;
}

export interface CKANResult {
  id: string;
  title: string;
  notes: string;
  organization: string;
  resources: CKANResource[];
  tags: string[];
  metadata_created: string;
  metadata_modified: string;
}

export interface CKANSearchResponse {
  results: CKANResult[];
  count: number;
}

// Popular dataset categories for quick access
export const POPULAR_DATASETS = [
  { query: 'ISTAT popolazione', label: 'Popolazione ISTAT', icon: '👥' },
  { query: 'bilancio pubblico MEF', label: 'Bilanci PA', icon: '💰' },
  { query: 'ANAC contratti appalti', label: 'Appalti ANAC', icon: '📋' },
  { query: 'INPS previdenza', label: 'Dati INPS', icon: '🏛️' },
  { query: 'protezione civile emergenze', label: 'Protezione Civile', icon: '🚨' },
  { query: 'ambiente inquinamento', label: 'Ambiente', icon: '🌿' },
  { query: 'trasporti mobilità', label: 'Trasporti', icon: '🚆' },
  { query: 'sanità salute', label: 'Sanità', icon: '🏥' },
  { query: 'istruzione scuola università', label: 'Istruzione', icon: '🎓' },
  { query: 'energia rinnovabile', label: 'Energia', icon: '⚡' },
];

export async function searchDatasets(query: string, limit = 10): Promise<CKANSearchResponse> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(`/api/ckan?q=${encodeURIComponent(query)}&rows=${limit}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { results: [], count: 0 };
    }

    const data = await response.json();
    const rawResults = data?.result?.results || [];
    const count = data?.result?.count || 0;

    const results: CKANResult[] = rawResults.map((r: Record<string, unknown>) => ({
      id: String(r.id || ''),
      title: String(r.title || ''),
      notes: String(r.notes || '').slice(0, 300),
      organization: String((r.organization as Record<string, unknown>)?.title || 'N/D'),
      resources: Array.isArray(r.resources)
        ? (r.resources as Array<Record<string, unknown>>).slice(0, 5).map(res => ({
            id: String(res.id || ''),
            name: String(res.name || res.format || 'Download'),
            format: String(res.format || '').toUpperCase(),
            url: String(res.url || ''),
          }))
        : [],
      tags: Array.isArray(r.tags)
        ? (r.tags as Array<Record<string, string>>).map(t => t.display_name || t.name || '').filter(Boolean)
        : [],
      metadata_created: String(r.metadata_created || ''),
      metadata_modified: String(r.metadata_modified || ''),
    }));

    return { results, count };
  } catch {
    return { results: [], count: 0 };
  }
}
