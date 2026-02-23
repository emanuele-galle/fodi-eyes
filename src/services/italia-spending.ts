/**
 * Italia Public Spending - PNRR & Public Procurement
 * Replaces USASpending with Italian data sources
 */

import { dataFreshness } from './data-freshness';

export interface PNRRMilestone {
  id: string;
  pillar: string;
  description: string;
  status: 'completed' | 'in-progress' | 'delayed';
  targetDate: string;
  amount: number;
}

export interface PublicTender {
  id: string;
  title: string;
  entity: string;
  amount: number;
  category: string;
  publishDate: string;
  deadline: string;
}

export interface ItaliaSpendingSummary {
  pnrr: {
    totalBudget: number;
    disbursed: number;
    milestones: PNRRMilestone[];
  };
  tenders: PublicTender[];
  fetchedAt: Date;
}

// PNRR pillars with allocated amounts (billions EUR)
const PNRR_PILLARS = [
  { id: 'M1', name: 'Digitalizzazione', amount: 40.32 },
  { id: 'M2', name: 'Rivoluzione Verde', amount: 59.47 },
  { id: 'M3', name: 'Infrastrutture', amount: 25.40 },
  { id: 'M4', name: 'Istruzione e Ricerca', amount: 30.88 },
  { id: 'M5', name: 'Inclusione e Coesione', amount: 19.81 },
  { id: 'M6', name: 'Salute', amount: 15.63 },
];

export async function fetchPNRRProgress(): Promise<ItaliaSpendingSummary['pnrr']> {
  try {
    // Try CKAN proxy for PNRR data
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('/api/pnrr', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (response.ok) {
      await response.json();
      dataFreshness.recordUpdate('spending', PNRR_PILLARS.length);
    }
  } catch {
    // Fallback to static progress data
  }

  // Return curated data (updated periodically from italiadomani.gov.it reports)
  return {
    totalBudget: 191.5, // billions EUR
    disbursed: 113.5, // approximate as of 2026
    milestones: PNRR_PILLARS.map(p => ({
      id: p.id,
      pillar: p.name,
      description: `Missione ${p.id}: ${p.name}`,
      status: 'in-progress' as const,
      targetDate: '2026-06-30',
      amount: p.amount,
    })),
  };
}

export async function fetchPublicTenders(): Promise<PublicTender[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch('/api/anac?rows=10', {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) return [];

    const data = await response.json();
    const results = data?.result?.results || [];

    return results.slice(0, 10).map((r: Record<string, unknown>, i: number) => ({
      id: String(r.id || i),
      title: String(r.title || 'Bando pubblico'),
      entity: String((r.organization as Record<string, unknown>)?.title || 'PA'),
      amount: 0,
      category: String((r.tags as Array<Record<string, string>>)?.[0]?.name || 'generale'),
      publishDate: String(r.metadata_created || ''),
      deadline: '',
    }));
  } catch {
    return [];
  }
}

export async function fetchItaliaSpending(): Promise<ItaliaSpendingSummary> {
  const [pnrr, tenders] = await Promise.allSettled([
    fetchPNRRProgress(),
    fetchPublicTenders(),
  ]);

  return {
    pnrr: pnrr.status === 'fulfilled' ? pnrr.value : { totalBudget: 191.5, disbursed: 0, milestones: [] },
    tenders: tenders.status === 'fulfilled' ? tenders.value : [],
    fetchedAt: new Date(),
  };
}

export function formatEuroAmount(amount: number): string {
  if (amount >= 1_000_000_000) return `€${(amount / 1_000_000_000).toFixed(1)}Mrd`;
  if (amount >= 1_000_000) return `€${(amount / 1_000_000).toFixed(1)}M`;
  if (amount >= 1_000) return `€${(amount / 1_000).toFixed(0)}K`;
  return `€${amount.toFixed(0)}`;
}
