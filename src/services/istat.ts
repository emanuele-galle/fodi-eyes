/**
 * ISTAT SDMX REST API service
 * Fetches Italian economic/demographic indicators from ISTAT
 * Docs: https://developers.istat.it/
 */

export interface IstatIndicator {
  id: string;
  name: string;
  value: number | null;
  unit: string;
  period: string;
  area?: string;
}

export interface IstatData {
  economia: IstatIndicator[];
  demografia: IstatIndicator[];
  pnrr: PnrrIndicator[];
  lastUpdate: string;
}

export interface PnrrIndicator {
  pillar: string;
  allocated: number;
  spent: number;
  percentage: number;
}

// ISTAT SDMX datasets
const ISTAT_DATASETS = {
  pil: { dataflow: '122_54', key: 'Q..VNPILTOT.9.0', name: 'PIL (var. % trimestrale)' },
  inflazione: { dataflow: '122_331', key: 'M.IT.CP00.AVGRTE', name: 'Inflazione (HICP %)' },
  disoccupazione: { dataflow: '100_955', key: 'M.IT.UR_TOT', name: 'Tasso disoccupazione (%)' },
  popolazione: { dataflow: '22_315', key: 'A.IT.POP_TOT', name: 'Popolazione totale' },
};

const PROXY_BASE = '/api/istat';

async function fetchIstatSeries(dataset: string, key: string): Promise<{ value: number | null; period: string }> {
  try {
    const url = `${PROXY_BASE}?dataset=${encodeURIComponent(dataset)}&key=${encodeURIComponent(key)}`;
    const response = await fetch(url);
    if (!response.ok) return { value: null, period: '' };
    const data = await response.json();

    // Parse SDMX-JSON structure
    if (data?.dataSets?.[0]?.series) {
      const series = data.dataSets[0].series;
      const firstKey = Object.keys(series)[0];
      if (firstKey) {
        const observations = series[firstKey].observations;
        const obsKeys = Object.keys(observations).sort((a, b) => Number(b) - Number(a));
        const latestKey = obsKeys[0];
        if (latestKey !== undefined) {
          const value = observations[latestKey][0];
          // Get period from dimensions
          const timeIdx = Number(latestKey);
          const timeDim = data.structure?.dimensions?.observation?.[0]?.values?.[timeIdx];
          const period = timeDim?.name || timeDim?.id || '';
          return { value: typeof value === 'number' ? value : null, period };
        }
      }
    }
    return { value: null, period: '' };
  } catch {
    return { value: null, period: '' };
  }
}

export async function fetchIstatEconomia(): Promise<IstatIndicator[]> {
  const results: IstatIndicator[] = [];

  const entries = Object.entries(ISTAT_DATASETS).filter(([k]) => k !== 'popolazione');
  const fetches = entries.map(async ([id, config]) => {
    const { value, period } = await fetchIstatSeries(config.dataflow, config.key);
    results.push({
      id,
      name: config.name,
      value,
      unit: '%',
      period,
    });
  });

  // Also fetch spread BTP-Bund (not from ISTAT, use a simple proxy)
  fetches.push(
    (async () => {
      try {
        const resp = await fetch('/api/istat?type=spread');
        if (resp.ok) {
          const data = await resp.json();
          results.push({
            id: 'spread',
            name: 'Spread BTP-Bund',
            value: data.value ?? null,
            unit: 'bps',
            period: data.period || new Date().toISOString().slice(0, 10),
          });
        }
      } catch { /* ignore */ }
    })()
  );

  await Promise.allSettled(fetches);
  return results;
}

export async function fetchIstatDemografia(): Promise<IstatIndicator[]> {
  const results: IstatIndicator[] = [];

  const { value, period } = await fetchIstatSeries(
    ISTAT_DATASETS.popolazione.dataflow,
    ISTAT_DATASETS.popolazione.key,
  );
  results.push({
    id: 'popolazione',
    name: ISTAT_DATASETS.popolazione.name,
    value,
    unit: '',
    period,
  });

  return results;
}

// PNRR data — static snapshot (updated periodically)
// Source: italiadomani.gov.it
export function getPnrrData(): PnrrIndicator[] {
  return [
    { pillar: 'Digitalizzazione', allocated: 40.32, spent: 14.8, percentage: 36.7 },
    { pillar: 'Rivoluzione Verde', allocated: 59.47, spent: 19.2, percentage: 32.3 },
    { pillar: 'Infrastrutture', allocated: 25.40, spent: 10.5, percentage: 41.3 },
    { pillar: 'Istruzione e Ricerca', allocated: 30.88, spent: 11.1, percentage: 36.0 },
    { pillar: 'Inclusione e Coesione', allocated: 19.81, spent: 7.3, percentage: 36.8 },
    { pillar: 'Salute', allocated: 15.63, spent: 5.8, percentage: 37.1 },
  ];
}
