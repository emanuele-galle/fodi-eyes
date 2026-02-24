import { promises as dns } from 'dns';
import type { ScanModule, ModuleResult, Relationship } from '../types.js';

export const dnsModule: ScanModule = {
  id: 'dns',
  name: 'DNS Records',
  description: 'Retrieve DNS records (A, AAAA, MX, NS, TXT, CNAME, SOA)',
  targetTypes: ['domain'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];
    const data: Record<string, unknown> = {};

    const recordTypes = ['A', 'AAAA', 'MX', 'NS', 'TXT', 'CNAME', 'SOA'] as const;

    for (const type of recordTypes) {
      if (signal.aborted) break;
      try {
        switch (type) {
          case 'A': {
            const records = await dns.resolve4(target);
            data.A = records;
            records.forEach(ip => relationships.push({ source: target, target: ip, type: 'resolves_to', label: 'A' }));
            break;
          }
          case 'AAAA': {
            const records = await dns.resolve6(target);
            data.AAAA = records;
            records.forEach(ip => relationships.push({ source: target, target: ip, type: 'resolves_to', label: 'AAAA' }));
            break;
          }
          case 'MX': {
            const records = await dns.resolveMx(target);
            data.MX = records;
            records.forEach(mx => relationships.push({ source: target, target: mx.exchange, type: 'has_mx', label: `priority ${mx.priority}` }));
            break;
          }
          case 'NS': {
            const records = await dns.resolveNs(target);
            data.NS = records;
            records.forEach(ns => relationships.push({ source: target, target: ns, type: 'has_ns' }));
            break;
          }
          case 'TXT': {
            const records = await dns.resolveTxt(target);
            data.TXT = records.map(r => r.join(''));
            break;
          }
          case 'CNAME': {
            const records = await dns.resolveCname(target);
            data.CNAME = records;
            records.forEach(cn => relationships.push({ source: target, target: cn, type: 'cname_to' }));
            break;
          }
          case 'SOA': {
            const soa = await dns.resolveSoa(target);
            data.SOA = soa;
            break;
          }
        }
      } catch {
        // Record type not available - skip
      }
    }

    return {
      moduleId: 'dns',
      name: 'DNS Records',
      status: Object.keys(data).length > 0 ? 'success' : 'error',
      data,
      relationships,
      duration: Date.now() - start,
    };
  },
};
