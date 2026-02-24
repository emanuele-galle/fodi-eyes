import { promises as dns } from 'dns';
import type { ScanModule, ModuleResult, Relationship } from '../types.js';

const SHODAN_API_KEY = process.env.SHODAN_API_KEY;

interface ShodanHostResponse {
  ip_str?: string;
  hostnames?: string[];
  ports?: number[];
  vulns?: string[];
  cpes?: string[];
  tags?: string[];
  org?: string;
  isp?: string;
  country_name?: string;
  city?: string;
  data?: Array<{
    port?: number;
    transport?: string;
    product?: string;
    version?: string;
    banner?: string;
  }>;
}

interface InternetDbResponse {
  ip?: string;
  ports?: number[];
  hostnames?: string[];
  cpes?: string[];
  vulns?: string[];
  tags?: string[];
}

async function resolveToIp(domain: string): Promise<string | null> {
  try {
    const addresses = await dns.resolve4(domain);
    return addresses[0] ?? null;
  } catch {
    return null;
  }
}

async function fetchWithTimeout(url: string, signal: AbortSignal): Promise<Response> {
  // Wrap the provided signal with a module-level 10s timeout
  const localController = new AbortController();
  const timer = setTimeout(() => localController.abort(), 10_000);

  const combinedSignal = signal.aborted
    ? signal
    : (() => {
        const outer = signal;
        outer.addEventListener('abort', () => localController.abort(), { once: true });
        return localController.signal;
      })();

  try {
    return await fetch(url, { signal: combinedSignal });
  } finally {
    clearTimeout(timer);
  }
}

export const shodanModule: ScanModule = {
  id: 'shodan',
  name: 'Shodan IoT Search',
  description: 'Search Shodan for exposed services and IoT devices',
  targetTypes: ['domain', 'ip'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];
    const data: Record<string, unknown> = {};

    // Resolve domain to IP if needed
    let ip = target;
    if (!/^[\d.]+$/.test(target) && !target.includes(':')) {
      const resolved = await resolveToIp(target);
      if (!resolved) {
        return {
          moduleId: 'shodan',
          name: 'Shodan IoT Search',
          status: 'error',
          data: {},
          relationships: [],
          duration: Date.now() - start,
          error: `Could not resolve domain "${target}" to an IP address`,
        };
      }
      ip = resolved;
      data.resolvedIp = ip;
    }

    try {
      let ports: number[] = [];
      let hostnames: string[] = [];
      let vulns: string[] = [];
      let cpes: string[] = [];
      let tags: string[] = [];

      if (SHODAN_API_KEY) {
        // Full Shodan API
        const url = `https://api.shodan.io/shodan/host/${encodeURIComponent(ip)}?key=${SHODAN_API_KEY}`;
        const res = await fetchWithTimeout(url, signal);

        if (res.status === 404) {
          return {
            moduleId: 'shodan',
            name: 'Shodan IoT Search',
            status: 'success',
            data: { ip, message: 'No information available in Shodan for this IP' },
            relationships: [],
            duration: Date.now() - start,
          };
        }

        if (res.status === 429) {
          return {
            moduleId: 'shodan',
            name: 'Shodan IoT Search',
            status: 'error',
            data: {},
            relationships: [],
            duration: Date.now() - start,
            error: 'Shodan API rate limit exceeded',
          };
        }

        if (!res.ok) {
          throw new Error(`Shodan API returned HTTP ${res.status}`);
        }

        const body = (await res.json()) as ShodanHostResponse;

        ports = body.ports ?? [];
        hostnames = body.hostnames ?? [];
        vulns = body.vulns ?? [];
        cpes = body.cpes ?? [];
        tags = body.tags ?? [];

        data.ip = body.ip_str ?? ip;
        data.org = body.org;
        data.isp = body.isp;
        data.country = body.country_name;
        data.city = body.city;
        data.ports = ports;
        data.hostnames = hostnames;
        data.vulns = vulns;
        data.cpes = cpes;
        data.tags = tags;

        // Include per-port service detail when available
        if (body.data && body.data.length > 0) {
          data.services = body.data.map(s => ({
            port: s.port,
            transport: s.transport,
            product: s.product,
            version: s.version,
          }));
        }
      } else {
        // Free InternetDB API (no key required)
        const url = `https://internetdb.shodan.io/${encodeURIComponent(ip)}`;
        const res = await fetchWithTimeout(url, signal);

        if (res.status === 404) {
          return {
            moduleId: 'shodan',
            name: 'Shodan IoT Search',
            status: 'success',
            data: { ip, message: 'No information available in Shodan for this IP' },
            relationships: [],
            duration: Date.now() - start,
          };
        }

        if (res.status === 429) {
          return {
            moduleId: 'shodan',
            name: 'Shodan IoT Search',
            status: 'error',
            data: {},
            relationships: [],
            duration: Date.now() - start,
            error: 'Shodan InternetDB rate limit exceeded',
          };
        }

        if (!res.ok) {
          throw new Error(`Shodan InternetDB returned HTTP ${res.status}`);
        }

        const body = (await res.json()) as InternetDbResponse;

        ports = body.ports ?? [];
        hostnames = body.hostnames ?? [];
        vulns = body.vulns ?? [];
        cpes = body.cpes ?? [];
        tags = body.tags ?? [];

        data.ip = body.ip ?? ip;
        data.ports = ports;
        data.hostnames = hostnames;
        data.vulns = vulns;
        data.cpes = cpes;
        data.tags = tags;
        data.source = 'internetdb.shodan.io (free tier)';
      }

      // Build relationships
      for (const port of ports) {
        relationships.push({
          source: ip,
          target: String(port),
          type: 'has_port',
          label: `port ${port}`,
        });
      }

      for (const vuln of vulns) {
        relationships.push({
          source: ip,
          target: vuln,
          type: 'has_vuln',
          label: vuln,
        });
      }

      for (const hostname of hostnames) {
        relationships.push({
          source: ip,
          target: hostname,
          type: 'has_hostname',
          label: hostname,
        });
      }

      const hasData =
        ports.length > 0 || hostnames.length > 0 || vulns.length > 0;

      return {
        moduleId: 'shodan',
        name: 'Shodan IoT Search',
        status: hasData ? 'success' : 'partial',
        data,
        relationships,
        duration: Date.now() - start,
      };
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        return {
          moduleId: 'shodan',
          name: 'Shodan IoT Search',
          status: 'error',
          data: {},
          relationships: [],
          duration: Date.now() - start,
          error: 'Request aborted or timed out',
        };
      }

      return {
        moduleId: 'shodan',
        name: 'Shodan IoT Search',
        status: 'error',
        data: {},
        relationships: [],
        duration: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
