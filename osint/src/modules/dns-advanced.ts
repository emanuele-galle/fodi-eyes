import { promises as dns } from 'dns';
import type { ScanModule, ModuleResult, Relationship } from '../types.js';

interface DmarcResult {
  record?: string;
  policy?: string;
  rua?: string | null;
  ruf?: string | null;
  percentage?: number;
  configured: boolean;
  warning?: string;
}

interface SpfResult {
  record?: string;
  includes?: string[];
  allowedIps?: string[];
  mechanisms?: string[];
  allPolicy?: string;
  configured: boolean;
  warning?: string;
}

interface DkimSelectorResult {
  selector: string;
  found: boolean;
  keyType?: string;
}

interface DkimResult {
  selectors: DkimSelectorResult[];
  totalFound: number;
}

interface CaaRecord {
  critical: number;
  tag: string;
  value: string;
}

interface CaaResult {
  records?: CaaRecord[];
  configured: boolean;
  info?: string;
}

interface WildcardResult {
  detected: boolean;
  resolvedTo?: string[];
  warning?: string;
}

interface EmailSecurityScore {
  score: number;
  rating: 'GOOD' | 'FAIR' | 'POOR';
}

const DKIM_SELECTORS = [
  'default', 'google', 'selector1', 'selector2', 'k1', 'k2',
  'mail', 'dkim', 's1', 's2', 'mandrill', 'amazonses', 'smtp',
];

async function probeDmarc(target: string): Promise<DmarcResult> {
  try {
    const records = await dns.resolveTxt(`_dmarc.${target}`);
    const record = records.flat().find(r => r.startsWith('v=DMARC1'));

    if (!record) return { configured: false, warning: 'No DMARC record found — domain is vulnerable to email spoofing' };

    const policy = record.match(/p=(\w+)/)?.[1] ?? 'none';
    const rua = record.match(/rua=([^;]+)/)?.[1] ?? null;
    const ruf = record.match(/ruf=([^;]+)/)?.[1] ?? null;
    const pct = parseInt(record.match(/pct=(\d+)/)?.[1] ?? '100', 10);

    const result: DmarcResult = { record, policy, rua, ruf, percentage: pct, configured: true };
    if (policy === 'none') result.warning = 'DMARC policy is "none" — emails are not protected against spoofing';

    return result;
  } catch {
    return { configured: false, warning: 'No DMARC record found' };
  }
}

async function probeSpf(target: string): Promise<SpfResult> {
  try {
    const txt = await dns.resolveTxt(target);
    const record = txt.flat().find(r => r.startsWith('v=spf1'));

    if (!record) return { configured: false, warning: 'No SPF record found' };

    const includes = [...record.matchAll(/include:([^\s]+)/g)].map(m => m[1]);
    const allowedIps = [...record.matchAll(/ip[46]:([^\s]+)/g)].map(m => m[1]);
    const mechanisms = record.split(/\s+/).filter(m => !m.startsWith('v='));
    const allPolicy = record.match(/[~+?-]all/)?.[0] ?? 'missing';

    const result: SpfResult = { record, includes, allowedIps, mechanisms, allPolicy, configured: true };
    if (allPolicy === '+all') {
      result.warning = 'SPF uses "+all" — allows ANY server to send email for this domain (DANGEROUS)';
    }

    return result;
  } catch {
    return { configured: false };
  }
}

async function probeDkim(target: string, signal: AbortSignal): Promise<DkimResult> {
  const selectors: DkimSelectorResult[] = [];

  for (const selector of DKIM_SELECTORS) {
    if (signal.aborted) break;

    try {
      const records = await dns.resolveTxt(`${selector}._domainkey.${target}`);
      const record = records.flat().join('');

      if (record.includes('v=DKIM1') || record.includes('p=')) {
        const keyType = record.match(/k=(\w+)/)?.[1] ?? 'rsa';
        selectors.push({ selector, found: true, keyType });
      }
    } catch { /* selector not configured — expected */ }
  }

  return { selectors, totalFound: selectors.length };
}

async function probeCaa(target: string): Promise<CaaResult> {
  try {
    const records = await dns.resolveCaa(target);
    return {
      records: records.map(r => {
        // Node's dns.CaaRecord exposes issue/issuewild/iodef as the tag field
        const rec = r as unknown as Record<string, string | number>;
        const tag = 'issue' in r ? 'issue' : 'issuewild' in r ? 'issuewild' : 'iodef';
        const value = String(rec[tag] ?? '');
        return { critical: r.critical, tag, value };
      }),
      configured: true,
    };
  } catch {
    return { configured: false, info: 'No CAA records — any CA can issue certificates for this domain' };
  }
}

async function probeWildcard(target: string): Promise<WildcardResult> {
  const randomSub = `xq7z9k2m4p1w3v${Date.now()}.${target}`;
  try {
    const ips = await dns.resolve4(randomSub);
    return {
      detected: true,
      resolvedTo: ips,
      warning: 'Wildcard DNS detected — subdomain enumeration results may contain false positives',
    };
  } catch {
    return { detected: false };
  }
}

function computeEmailScore(dmarc: DmarcResult, spf: SpfResult, dkim: DkimResult): EmailSecurityScore {
  const dmarcOk = dmarc.configured && dmarc.policy !== 'none';
  const spfOk = spf.configured && spf.allPolicy !== '+all';
  const dkimOk = dkim.totalFound > 0;

  const score = (dmarcOk ? 33 : 0) + (spfOk ? 33 : 0) + (dkimOk ? 34 : 0);
  const rating = score >= 80 ? 'GOOD' : score >= 50 ? 'FAIR' : 'POOR';

  return { score, rating };
}

export const dnsAdvancedModule: ScanModule = {
  id: 'dns-advanced',
  name: 'DNS Advanced Analysis',
  description: 'Analyzes DMARC, SPF, DKIM, CAA records and detects DNS wildcard configuration',
  targetTypes: ['domain'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];

    try {
      const [dmarc, spf, dkim, caa, wildcard] = await Promise.all([
        probeDmarc(target),
        probeSpf(target),
        probeDkim(target, signal),
        probeCaa(target),
        probeWildcard(target),
      ]);

      // Relationships: DMARC
      if (dmarc.policy) {
        relationships.push({ source: target, target: `dmarc:${dmarc.policy}`, type: 'dmarc_policy' });
      }

      // Relationships: SPF includes
      for (const inc of dmarc?.configured ? (spf.includes ?? []) : []) {
        relationships.push({ source: target, target: inc, type: 'spf_include' });
      }
      if (spf.configured) {
        for (const inc of spf.includes ?? []) {
          relationships.push({ source: target, target: inc, type: 'spf_include' });
        }
      }

      // Relationships: DKIM selectors
      for (const s of dkim.selectors) {
        relationships.push({ source: target, target: `dkim:${s.selector}`, type: 'dkim_selector' });
      }

      // Relationships: CAA
      if (caa.configured && caa.records) {
        for (const r of caa.records) {
          relationships.push({ source: target, target: r.value, type: 'caa_authorized' });
        }
      }

      // Nameservers (informational — AXFR requires out-of-band tooling)
      let nameservers: string[] = [];
      try {
        nameservers = await dns.resolveNs(target);
      } catch { /* optional */ }

      return {
        moduleId: 'dns-advanced',
        name: 'DNS Advanced Analysis',
        status: 'success',
        data: {
          dmarc,
          spf,
          dkim,
          caa,
          wildcardDns: wildcard,
          nameservers,
          axfrNote: 'Zone transfer (AXFR) requires out-of-band tooling: dig @<NS> AXFR <domain>',
          emailSecurityScore: computeEmailScore(dmarc, spf, dkim),
        },
        relationships,
        duration: Date.now() - start,
      };
    } catch (err) {
      return {
        moduleId: 'dns-advanced',
        name: 'DNS Advanced Analysis',
        status: 'error',
        data: {},
        relationships: [],
        duration: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
