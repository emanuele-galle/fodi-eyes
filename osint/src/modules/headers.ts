import type { ScanModule, ModuleResult, Relationship } from '../types.js';

export const headersModule: ScanModule = {
  id: 'headers',
  name: 'HTTP Headers Analysis',
  description: 'Analyze HTTP response headers for security and tech stack info',
  targetTypes: ['domain'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];

    try {
      const url = target.startsWith('http') ? target : `https://${target}`;
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      signal.addEventListener('abort', () => controller.abort());

      const res = await fetch(url, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal,
        headers: { 'User-Agent': 'Fodi-Eyes OSINT Scanner/1.0' },
      });
      clearTimeout(timeout);

      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // Security headers analysis
      const securityHeaders = {
        'strict-transport-security': headers['strict-transport-security'] || null,
        'content-security-policy': headers['content-security-policy'] || null,
        'x-frame-options': headers['x-frame-options'] || null,
        'x-content-type-options': headers['x-content-type-options'] || null,
        'x-xss-protection': headers['x-xss-protection'] || null,
        'referrer-policy': headers['referrer-policy'] || null,
        'permissions-policy': headers['permissions-policy'] || null,
      };

      const missingSecurityHeaders = Object.entries(securityHeaders)
        .filter(([, v]) => !v)
        .map(([k]) => k);

      // Tech detection
      const server = headers['server'] || null;
      const poweredBy = headers['x-powered-by'] || null;

      if (server) {
        relationships.push({ source: target, target: server, type: 'runs_on', label: 'Server' });
      }
      if (poweredBy) {
        relationships.push({ source: target, target: poweredBy, type: 'powered_by' });
      }

      return {
        moduleId: 'headers',
        name: 'HTTP Headers Analysis',
        status: 'success',
        data: {
          statusCode: res.status,
          headers,
          securityHeaders,
          missingSecurityHeaders,
          server,
          poweredBy,
          redirectedTo: res.url !== url ? res.url : null,
        },
        relationships,
        duration: Date.now() - start,
      };
    } catch (err) {
      return {
        moduleId: 'headers',
        name: 'HTTP Headers Analysis',
        status: 'error',
        data: {},
        relationships: [],
        duration: Date.now() - start,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  },
};
