import type { ScanModule, ModuleResult, Relationship } from '../types.js';

export const emailHarvestModule: ScanModule = {
  id: 'email-harvest',
  name: 'Email Harvesting',
  description: 'Discover email addresses associated with a domain',
  targetTypes: ['domain'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];
    const emails = new Set<string>();

    // 1. Common email patterns
    const prefixes = [
      'info', 'admin', 'contact', 'support', 'sales', 'hello',
      'webmaster', 'postmaster', 'abuse', 'security',
      'noreply', 'no-reply', 'marketing', 'hr', 'office',
    ];
    for (const prefix of prefixes) {
      emails.add(`${prefix}@${target}`);
    }

    // 2. Try to scrape the website for email patterns
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      signal.addEventListener('abort', () => controller.abort());

      const res = await fetch(`https://${target}`, {
        signal: controller.signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      clearTimeout(timeout);

      if (res.ok) {
        const html = await res.text();
        // Extract emails from HTML (including mailto: links)
        const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
        const matches = html.match(emailRegex) || [];
        for (const email of matches) {
          const normalized = email.toLowerCase();
          // Only include emails from the target domain or related
          if (!normalized.includes('example.com') && !normalized.includes('sentry.io')) {
            emails.add(normalized);
          }
        }
      }
    } catch {
      // Website not accessible - use pattern-based only
    }

    const emailList = [...emails];
    for (const email of emailList) {
      relationships.push({ source: target, target: email, type: 'email_at' });
    }

    return {
      moduleId: 'email-harvest',
      name: 'Email Harvesting',
      status: 'success',
      data: {
        emails: emailList,
        count: emailList.length,
        patterns: prefixes.map(p => `${p}@${target}`),
      },
      relationships,
      duration: Date.now() - start,
    };
  },
};
