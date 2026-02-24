import { v4 as uuidv4 } from 'uuid';
import type { ScanModule, ScanResult, ScanTarget, ModuleResult, Relationship, TargetType } from './types.js';
import { dnsModule } from './modules/dns.js';
import { whoisModule } from './modules/whois.js';
import { subdomainsModule } from './modules/subdomains.js';
import { headersModule } from './modules/headers.js';
import { sslModule } from './modules/ssl.js';
import { geoIpModule } from './modules/geo-ip.js';
import { portsModule } from './modules/ports.js';
import { socialLookupModule } from './modules/social-lookup.js';
import { emailHarvestModule } from './modules/email-harvest.js';
import { shodanModule } from './modules/shodan.js';
import { techProfilerModule } from './modules/tech-profiler.js';
import { reverseDnsModule } from './modules/reverse-dns.js';
import { waybackModule } from './modules/wayback.js';
import { threatIntelModule } from './modules/threat-intel.js';
import { dnsAdvancedModule } from './modules/dns-advanced.js';

const ALL_MODULES: ScanModule[] = [
  dnsModule, whoisModule, subdomainsModule, headersModule,
  sslModule, geoIpModule, portsModule, socialLookupModule,
  emailHarvestModule, shodanModule,
  techProfilerModule, reverseDnsModule, waybackModule,
  threatIntelModule, dnsAdvancedModule,
];

const scans = new Map<string, ScanResult>();
const controllers = new Map<string, AbortController>();

// Auto-detect target type
function detectTargetType(target: string): TargetType {
  if (/^[\d.]+$/.test(target) || target.includes(':')) return 'ip';
  if (target.includes('@')) return 'email';
  if (/^[a-zA-Z0-9._-]+$/.test(target) && !target.includes('.')) return 'username';
  return 'domain';
}

export function getModules(): Array<{ id: string; name: string; description: string; targetTypes: TargetType[] }> {
  return ALL_MODULES.map(m => ({
    id: m.id,
    name: m.name,
    description: m.description,
    targetTypes: m.targetTypes,
  }));
}

export function getScan(id: string): ScanResult | undefined {
  return scans.get(id);
}

export async function startScan(target: string, moduleIds: string[], targetType?: TargetType): Promise<string> {
  const type = targetType || detectTargetType(target);
  const id = uuidv4();

  const scanTarget: ScanTarget = { value: target, type };

  const result: ScanResult = {
    id,
    target: scanTarget,
    status: 'running',
    startedAt: new Date().toISOString(),
    modules: [],
    relationships: [],
  };

  scans.set(id, result);

  const controller = new AbortController();
  controllers.set(id, controller);

  // Run scan in background
  void runScan(id, target, type, moduleIds, controller);

  return id;
}

async function runScan(id: string, target: string, type: TargetType, moduleIds: string[], controller: AbortController): Promise<void> {
  const scan = scans.get(id);
  if (!scan) return;

  // Auto-timeout after 5 minutes
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);

  const selectedModules = moduleIds.length > 0
    ? ALL_MODULES.filter(m => moduleIds.includes(m.id))
    : ALL_MODULES;

  // Filter modules compatible with target type
  const compatibleModules = selectedModules.filter(m => m.targetTypes.includes(type));

  // Run modules sequentially to avoid rate limiting
  for (const mod of compatibleModules) {
    if (controller.signal.aborted) break;
    try {
      const moduleResult = await mod.run(target, controller.signal);
      scan.modules.push(moduleResult);
      scan.relationships.push(...moduleResult.relationships);
    } catch (err) {
      scan.modules.push({
        moduleId: mod.id,
        name: mod.name,
        status: 'error',
        data: {},
        relationships: [],
        duration: 0,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  clearTimeout(timeout);
  controllers.delete(id);

  scan.status = scan.modules.some(m => m.status === 'error') && scan.modules.every(m => m.status === 'error')
    ? 'error'
    : 'completed';
  scan.completedAt = new Date().toISOString();

  // Clean up old scans (keep last 50)
  if (scans.size > 50) {
    const entries = [...scans.entries()].sort((a, b) =>
      new Date(a[1].startedAt).getTime() - new Date(b[1].startedAt).getTime()
    );
    while (scans.size > 50) {
      const oldest = entries.shift();
      if (oldest) scans.delete(oldest[0]);
    }
  }
}

export function exportScan(id: string, format: 'json' | 'csv'): string | null {
  const scan = scans.get(id);
  if (!scan) return null;

  if (format === 'json') {
    return JSON.stringify(scan, null, 2);
  }

  // CSV export
  const lines = ['Module,Status,Duration(ms),Key,Value'];
  for (const mod of scan.modules) {
    const flatData = flattenObject(mod.data);
    for (const [key, value] of Object.entries(flatData)) {
      lines.push(`"${mod.name}","${mod.status}",${mod.duration},"${key}","${String(value).replace(/"/g, '""')}"`);
    }
    if (Object.keys(flatData).length === 0) {
      lines.push(`"${mod.name}","${mod.status}",${mod.duration},"",""`);
    }
  }
  return lines.join('\n');
}

export function abortScan(id: string): void {
  const controller = controllers.get(id);
  if (controller) {
    controller.abort();
    controllers.delete(id);
  }
  const scan = scans.get(id);
  if (scan && scan.status === 'running') {
    scan.status = 'error';
    scan.completedAt = new Date().toISOString();
  }
}

function flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      Object.assign(result, flattenObject(value as Record<string, unknown>, fullKey));
    } else if (Array.isArray(value)) {
      result[fullKey] = value.join(', ');
    } else {
      result[fullKey] = String(value ?? '');
    }
  }
  return result;
}
