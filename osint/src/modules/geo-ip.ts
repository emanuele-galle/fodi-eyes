import type { ScanModule, ModuleResult, Relationship } from '../types.js';

export const geoIpModule: ScanModule = {
  id: 'geo-ip',
  name: 'IP Geolocation',
  description: 'Geolocate IP addresses',
  targetTypes: ['ip', 'domain'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      signal.addEventListener('abort', () => controller.abort());

      // Use ip-api.com (free, no key needed, 45 req/min)
      const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(target)}?fields=status,message,country,countryCode,region,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json() as Record<string, unknown>;

      if (data.status === 'fail') {
        return {
          moduleId: 'geo-ip',
          name: 'IP Geolocation',
          status: 'error',
          data: { error: data.message },
          relationships: [],
          duration: Date.now() - start,
          error: String(data.message),
        };
      }

      if (data.isp) relationships.push({ source: target, target: String(data.isp), type: 'hosted_by' });
      if (data.org) relationships.push({ source: target, target: String(data.org), type: 'org' });
      if (data.country) relationships.push({ source: target, target: String(data.country), type: 'located_in' });

      return {
        moduleId: 'geo-ip',
        name: 'IP Geolocation',
        status: 'success',
        data,
        relationships,
        duration: Date.now() - start,
      };
    } catch (err) {
      return {
        moduleId: 'geo-ip',
        name: 'IP Geolocation',
        status: 'error',
        data: {},
        relationships: [],
        duration: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
