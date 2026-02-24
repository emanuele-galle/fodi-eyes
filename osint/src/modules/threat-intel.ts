import { promises as dns } from 'dns';
import type { ScanModule, ModuleResult, Relationship } from '../types.js';

type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
type RiskRating = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'CLEAN';

interface ThreatEntry {
  source: string;
  threat: string;
  severity: Severity;
  details: string;
}

interface UrlhausUrl {
  url: string;
  url_status: string;
  threat: string;
  date_added: string;
  tags?: string[];
}

interface UrlhausResponse {
  query_status: string;
  urlhaus_reference?: string;
  urls?: UrlhausUrl[];
}

interface AbuseIpDbData {
  abuseConfidenceScore: number;
  totalReports: number;
  countryCode: string;
  isp: string;
  domain: string;
  usageType: string;
  isWhitelisted: boolean;
}

interface AbuseIpDbResponse {
  data?: AbuseIpDbData;
}

interface OtxPulse {
  name: string;
  tags: string[];
  created: string;
}

interface OtxResponse {
  pulse_info?: {
    count: number;
    pulses?: OtxPulse[];
  };
  reputation?: number;
}

function abuseScoreToSeverity(score: number): Severity {
  if (score > 75) return 'CRITICAL';
  if (score > 50) return 'HIGH';
  if (score > 25) return 'MEDIUM';
  return 'LOW';
}

function pulseCountToSeverity(count: number): Severity {
  if (count > 10) return 'HIGH';
  if (count > 3) return 'MEDIUM';
  return 'LOW';
}

function scoreToRating(score: number): RiskRating {
  if (score >= 60) return 'CRITICAL';
  if (score >= 40) return 'HIGH';
  if (score >= 20) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'CLEAN';
}

export const threatIntelModule: ScanModule = {
  id: 'threat-intel',
  name: 'Threat Intelligence',
  description: 'Checks IP/domain against public threat feeds (URLhaus, AbuseIPDB, OTX AlienVault)',
  targetTypes: ['domain', 'ip'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];
    const threats: ThreatEntry[] = [];
    let riskScore = 0;

    const isIp = /^[\d.]+$/.test(target) || target.includes(':');

    // Resolve domain to IP when needed
    let ip = target;
    if (!isIp) {
      const ips = await dns.resolve4(target).catch(() => [] as string[]);
      ip = ips[0] ?? target;
    }

    try {
      // URLhaus — malware distribution (free, no key required)
      try {
        const urlhausRes = await fetch('https://urlhaus-api.abuse.ch/v1/host/', {
          method: 'POST',
          signal,
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `host=${encodeURIComponent(isIp ? ip : target)}`,
        });

        const urlhaus = await urlhausRes.json() as UrlhausResponse;

        if (urlhaus.urls && urlhaus.urls.length > 0) {
          const activeUrls = urlhaus.urls.filter(u => u.url_status === 'online');
          const severity: Severity = activeUrls.length > 0 ? 'CRITICAL' : 'HIGH';

          threats.push({
            source: 'URLhaus',
            threat: `${urlhaus.urls.length} malware URLs (${activeUrls.length} active)`,
            severity,
            details: urlhaus.urls.slice(0, 5).map(u => `${u.threat}: ${u.url} (${u.url_status})`).join('; '),
          });
          riskScore += activeUrls.length > 0 ? 40 : 20;
          relationships.push({
            source: target,
            target: 'URLhaus',
            type: 'flagged_by',
            label: `${urlhaus.urls.length} malware URLs`,
          });
        }
      } catch { /* URLhaus unavailable — skip */ }

      // AbuseIPDB — IP reputation (free tier; uses key when available)
      if (/^[\d.]+$/.test(ip)) {
        try {
          const abuseHeaders: Record<string, string> = { Accept: 'application/json' };
          const abuseKey = process.env.ABUSEIPDB_API_KEY;
          if (abuseKey) abuseHeaders['Key'] = abuseKey;

          const abuseRes = await fetch(
            `https://api.abuseipdb.com/api/v2/check?ipAddress=${encodeURIComponent(ip)}&maxAgeInDays=90`,
            { signal, headers: abuseHeaders },
          );

          if (abuseRes.ok) {
            const abuse = await abuseRes.json() as AbuseIpDbResponse;
            const d = abuse.data;

            if (d && d.abuseConfidenceScore > 0) {
              threats.push({
                source: 'AbuseIPDB',
                threat: `Abuse confidence: ${d.abuseConfidenceScore}%`,
                severity: abuseScoreToSeverity(d.abuseConfidenceScore),
                details: `${d.totalReports} reports, ISP: ${d.isp}, Usage: ${d.usageType}`,
              });
              riskScore += Math.min(d.abuseConfidenceScore / 2, 30);
              relationships.push({
                source: ip,
                target: 'AbuseIPDB',
                type: 'reported_abuse',
                label: `${d.abuseConfidenceScore}% confidence`,
              });
            }
          }
        } catch { /* AbuseIPDB unavailable — skip */ }
      }

      // OTX AlienVault — threat pulses (free, no key required for basic queries)
      try {
        const otxType = isIp ? 'IPv4' : 'domain';
        const otxRes = await fetch(
          `https://otx.alienvault.com/api/v1/indicators/${otxType}/${encodeURIComponent(isIp ? ip : target)}/general`,
          { signal, headers: { 'User-Agent': 'FodiEyes-OSINT/1.0' } },
        );

        if (otxRes.ok) {
          const otx = await otxRes.json() as OtxResponse;

          if (otx.pulse_info && otx.pulse_info.count > 0) {
            const pulseCount = otx.pulse_info.count;
            const topPulses = (otx.pulse_info.pulses ?? []).slice(0, 3).map(p => p.name).join(', ');

            threats.push({
              source: 'OTX AlienVault',
              threat: `Found in ${pulseCount} threat pulses`,
              severity: pulseCountToSeverity(pulseCount),
              details: topPulses || 'No details available',
            });
            riskScore += Math.min(pulseCount * 3, 30);
            relationships.push({
              source: target,
              target: 'OTX',
              type: 'in_threat_pulse',
              label: `${pulseCount} pulses`,
            });
          }
        }
      } catch { /* OTX unavailable — skip */ }

      return {
        moduleId: 'threat-intel',
        name: 'Threat Intelligence',
        status: 'success',
        data: {
          target,
          resolvedIp: ip !== target ? ip : undefined,
          riskScore,
          overallRisk: scoreToRating(riskScore),
          threats,
          sourcesChecked: ['URLhaus', 'AbuseIPDB', 'OTX AlienVault'],
        },
        relationships,
        duration: Date.now() - start,
      };
    } catch (err) {
      return {
        moduleId: 'threat-intel',
        name: 'Threat Intelligence',
        status: 'error',
        data: {},
        relationships: [],
        duration: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
