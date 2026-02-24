import type { ScanModule, ModuleResult, Relationship } from '../types.js';

interface WaybackAvailableResponse {
  archived_snapshots?: {
    closest?: {
      url: string;
      timestamp: string;
      status: string;
      available: boolean;
    };
  };
}

interface WaybackSnapshot {
  url: string;
  timestamp: string;
  status: string;
}

interface ExposedPath {
  path: string;
  timestamp: string;
}

const INTERESTING_PATHS = [
  '/robots.txt',
  '/sitemap.xml',
  '/.env',
  '/wp-config.php',
  '/admin',
  '/.git/config',
];

function parseTimestamp(ts: string): string | null {
  if (!ts || ts.length < 8) return null;
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`;
}

async function checkAvailability(url: string, signal: AbortSignal): Promise<WaybackAvailableResponse> {
  const res = await fetch(
    `https://archive.org/wayback/available?url=${encodeURIComponent(url)}`,
    { signal, headers: { 'User-Agent': 'FodiEyes-OSINT/1.0' } },
  );
  return res.json() as Promise<WaybackAvailableResponse>;
}

export const waybackModule: ScanModule = {
  id: 'wayback',
  name: 'Wayback Machine',
  description: 'Checks Internet Archive for historical snapshots and domain age verification',
  targetTypes: ['domain'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];

    try {
      // Latest snapshot availability
      const availData = await checkAvailability(target, signal);
      const latestSnapshot = availData?.archived_snapshots?.closest ?? null;

      // Oldest snapshot (chronological ascending)
      const cdxFirstRes = await fetch(
        `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(target)}&output=json&limit=1&fl=timestamp,original,statuscode&sort=asc`,
        { signal },
      );
      const cdxFirst = await cdxFirstRes.json() as string[][];

      // Most recent snapshot (chronological descending)
      const cdxLastRes = await fetch(
        `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(target)}&output=json&limit=1&fl=timestamp,original,statuscode&sort=desc`,
        { signal },
      );
      const cdxLast = await cdxLastRes.json() as string[][];

      // Estimated total snapshot count
      const countRes = await fetch(
        `https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(target)}&output=json&limit=0&showNumPages=true`,
        { signal },
      );
      const totalPages = parseInt(await countRes.text(), 10) || 0;

      // Check for historically exposed sensitive paths
      const exposedPaths: ExposedPath[] = [];

      for (const path of INTERESTING_PATHS) {
        if (signal.aborted) break;

        const pathData = await checkAvailability(`${target}${path}`, signal).catch(() => null);
        const closest = pathData?.archived_snapshots?.closest;

        if (closest?.available) {
          exposedPaths.push({ path, timestamp: parseTimestamp(closest.timestamp) ?? closest.timestamp });
          relationships.push({
            source: target,
            target: `${target}${path}`,
            type: 'archived_path',
            label: 'found in Wayback Machine',
          });
        }
      }

      const firstSeen = cdxFirst.length > 1 ? parseTimestamp(cdxFirst[1]?.[0] ?? '') : null;
      const lastSeen = cdxLast.length > 1 ? parseTimestamp(cdxLast[1]?.[0] ?? '') : null;

      const webAgeDays = firstSeen
        ? Math.floor((Date.now() - new Date(firstSeen).getTime()) / (1000 * 60 * 60 * 24))
        : null;

      if (firstSeen) {
        relationships.push({
          source: target,
          target: firstSeen,
          type: 'first_archived',
          label: 'First seen on Wayback Machine',
        });
      }

      const formattedLatest: WaybackSnapshot | null = latestSnapshot
        ? {
            url: latestSnapshot.url,
            timestamp: parseTimestamp(latestSnapshot.timestamp) ?? latestSnapshot.timestamp,
            status: latestSnapshot.status,
          }
        : null;

      return {
        moduleId: 'wayback',
        name: 'Wayback Machine',
        status: 'success',
        data: {
          available: !!latestSnapshot,
          latestSnapshot: formattedLatest,
          firstSeen,
          lastSeen,
          webAgeDays,
          estimatedSnapshots: totalPages * 5,
          exposedPaths,
        },
        relationships,
        duration: Date.now() - start,
      };
    } catch (err) {
      return {
        moduleId: 'wayback',
        name: 'Wayback Machine',
        status: 'error',
        data: {},
        relationships: [],
        duration: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
