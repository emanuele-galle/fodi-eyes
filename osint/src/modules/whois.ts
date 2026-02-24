import type { ScanModule, ModuleResult, Relationship } from '../types.js';

export const whoisModule: ScanModule = {
  id: 'whois',
  name: 'WHOIS Lookup',
  description: 'WHOIS registration data for domains and IPs',
  targetTypes: ['domain', 'ip'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];

    try {
      // Dynamic import because whois-json is CJS
      const whois = await import('whois-json');
      const lookupFn = whois.default || whois;

      if (signal.aborted) throw new Error('Aborted');

      const result = await lookupFn(target);
      const data = Array.isArray(result) ? result[0] ?? {} : result;

      // Extract relationships
      if (data.registrar) {
        relationships.push({ source: target, target: String(data.registrar), type: 'registered_by' });
      }
      if (data.registrantOrganization) {
        relationships.push({ source: target, target: String(data.registrantOrganization), type: 'owned_by' });
      }

      return {
        moduleId: 'whois',
        name: 'WHOIS Lookup',
        status: 'success',
        data: data as Record<string, unknown>,
        relationships,
        duration: Date.now() - start,
      };
    } catch (err) {
      return {
        moduleId: 'whois',
        name: 'WHOIS Lookup',
        status: 'error',
        data: {},
        relationships: [],
        duration: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
