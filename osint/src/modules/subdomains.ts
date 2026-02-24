import { promises as dns } from 'dns';
import type { ScanModule, ModuleResult, Relationship } from '../types.js';

// Top subdomains to bruteforce
const COMMON_SUBDOMAINS = [
  'www', 'mail', 'ftp', 'smtp', 'pop', 'imap', 'webmail',
  'ns1', 'ns2', 'dns', 'dns1', 'dns2',
  'api', 'dev', 'staging', 'test', 'beta', 'demo',
  'app', 'admin', 'panel', 'dashboard', 'portal',
  'cdn', 'static', 'assets', 'media', 'img', 'images',
  'blog', 'shop', 'store', 'docs', 'wiki', 'help', 'support',
  'vpn', 'remote', 'gateway', 'proxy',
  'db', 'database', 'mysql', 'postgres', 'redis', 'mongo',
  'git', 'gitlab', 'github', 'ci', 'jenkins', 'build',
  'monitor', 'grafana', 'prometheus', 'status',
  'auth', 'sso', 'login', 'oauth', 'id',
  'm', 'mobile', 'wap',
  'mx', 'mx1', 'mx2', 'relay',
  'cloud', 'aws', 'gcp', 's3',
  'old', 'new', 'legacy', 'v2', 'v3',
  'intranet', 'internal', 'corp', 'office',
];

export const subdomainsModule: ScanModule = {
  id: 'subdomains',
  name: 'Subdomain Enumeration',
  description: 'Discover subdomains via DNS bruteforce and crt.sh',
  targetTypes: ['domain'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const found: string[] = [];
    const relationships: Relationship[] = [];

    // 1. crt.sh certificate transparency
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      signal.addEventListener('abort', () => controller.abort());

      const res = await fetch(`https://crt.sh/?q=%25.${encodeURIComponent(target)}&output=json`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        const certs = await res.json() as Array<{ name_value: string }>;
        const subs = new Set<string>();
        for (const cert of certs) {
          const names = cert.name_value.split('\n');
          for (const name of names) {
            const clean = name.trim().replace(/^\*\./, '');
            if (clean.endsWith(`.${target}`) && clean !== target) {
              subs.add(clean);
            }
          }
        }
        found.push(...subs);
      }
    } catch {
      // crt.sh timeout or error - continue with DNS brute
    }

    // 2. DNS bruteforce (top subdomains)
    const BATCH_SIZE = 10;
    for (let i = 0; i < COMMON_SUBDOMAINS.length; i += BATCH_SIZE) {
      if (signal.aborted) break;
      const batch = COMMON_SUBDOMAINS.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (sub) => {
          const hostname = `${sub}.${target}`;
          try {
            const addrs = await dns.resolve4(hostname);
            if (addrs.length > 0) return hostname;
          } catch { /* not found */ }
          return null;
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled' && r.value) {
          if (!found.includes(r.value)) found.push(r.value);
        }
      }
    }

    // Build relationships
    for (const sub of found) {
      relationships.push({ source: sub, target: target, type: 'subdomain_of' });
    }

    return {
      moduleId: 'subdomains',
      name: 'Subdomain Enumeration',
      status: found.length > 0 ? 'success' : 'partial',
      data: { subdomains: found, count: found.length },
      relationships,
      duration: Date.now() - start,
    };
  },
};
