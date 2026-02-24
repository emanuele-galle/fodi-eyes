import { promises as dns } from 'dns';
import type { ScanModule, ModuleResult, Relationship } from '../types.js';

interface VerifiedHostname {
  hostname: string;
  verified: boolean;
  ips: string[];
}

function detectHostingProvider(hostname: string): string | null {
  if (hostname.includes('ec2') || hostname.includes('compute.amazonaws')) return 'AWS EC2';
  if (hostname.includes('googleusercontent')) return 'Google Cloud';
  if (hostname.includes('azure')) return 'Microsoft Azure';
  if (hostname.includes('digitalocean')) return 'DigitalOcean';
  if (hostname.includes('linode') || hostname.includes('akamai')) return 'Akamai/Linode';
  if (hostname.includes('hetzner')) return 'Hetzner';
  if (hostname.includes('ovh')) return 'OVH';
  if (hostname.includes('contabo')) return 'Contabo';
  if (hostname.includes('vultr')) return 'Vultr';
  return null;
}

export const reverseDnsModule: ScanModule = {
  id: 'reverse-dns',
  name: 'Reverse DNS',
  description: 'Performs reverse DNS lookups to discover hostnames associated with IP addresses',
  targetTypes: ['ip'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];

    try {
      const hostnames = await dns.reverse(target).catch(() => [] as string[]);
      const verified: VerifiedHostname[] = [];

      for (const hostname of hostnames) {
        if (signal.aborted) break;

        const ips = await dns.resolve4(hostname).catch(() => [] as string[]);
        const isVerified = ips.includes(target);

        verified.push({ hostname, verified: isVerified, ips });

        relationships.push({
          source: target,
          target: hostname,
          type: 'reverse_dns',
          label: isVerified ? 'verified' : 'unverified',
        });

        // Capture any other IPs the hostname resolves to
        for (const ip of ips) {
          if (ip !== target) {
            relationships.push({ source: hostname, target: ip, type: 'resolves_to' });
          }
        }
      }

      const providers: string[] = [];
      for (const hostname of hostnames) {
        const provider = detectHostingProvider(hostname);
        if (provider) providers.push(provider);
      }

      return {
        moduleId: 'reverse-dns',
        name: 'Reverse DNS',
        status: hostnames.length > 0 ? 'success' : 'partial',
        data: {
          ip: target,
          hostnames,
          verified,
          providers: [...new Set(providers)],
          total: hostnames.length,
        },
        relationships,
        duration: Date.now() - start,
      };
    } catch (err) {
      return {
        moduleId: 'reverse-dns',
        name: 'Reverse DNS',
        status: 'error',
        data: {},
        relationships: [],
        duration: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
