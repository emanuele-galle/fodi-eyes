import type { ScanModule, ModuleResult, Relationship } from '../types.js';

type TechCategory = 'cms' | 'framework' | 'server' | 'cdn' | 'analytics' | 'language' | 'security' | 'ecommerce';

function buildErrorResult(duration: number, err: unknown): ModuleResult {
  return {
    moduleId: 'tech-profiler',
    name: 'Technology Profiler',
    status: 'error',
    data: {},
    relationships: [],
    duration,
    error: err instanceof Error ? err.message : String(err),
  };
}

export const techProfilerModule: ScanModule = {
  id: 'tech-profiler',
  name: 'Technology Profiler',
  description: 'Detects web technologies, frameworks, CMS, CDN, and server stack via HTTP fingerprinting',
  targetTypes: ['domain'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();

    const technologies: Record<TechCategory, string[]> = {
      cms: [],
      framework: [],
      server: [],
      cdn: [],
      analytics: [],
      language: [],
      security: [],
      ecommerce: [],
    };

    const relationships: Relationship[] = [];

    try {
      const res = await fetch(`https://${target}`, {
        signal,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; FodiEyes-OSINT/1.0)' },
        redirect: 'follow',
      });

      const headers: Record<string, string> = {};
      res.headers.forEach((value, key) => { headers[key.toLowerCase()] = value; });

      const body = await res.text();
      const bodyLower = body.toLowerCase();
      const cookies = headers['set-cookie'] ?? '';

      // Server
      if (headers['server']) technologies.server.push(headers['server']);
      if (headers['x-powered-by']) technologies.server.push(`X-Powered-By: ${headers['x-powered-by']}`);

      // CDN
      if (headers['cf-ray']) technologies.cdn.push('Cloudflare');
      if (headers['x-fastly-request-id']) technologies.cdn.push('Fastly');
      if (headers['x-amz-cf-id'] || headers['x-amz-cf-pop']) technologies.cdn.push('AWS CloudFront');
      if (headers['x-akamai-transformed']) technologies.cdn.push('Akamai');
      if (headers['x-vercel-id']) technologies.cdn.push('Vercel');
      if (headers['x-netlify-request-id']) technologies.cdn.push('Netlify');

      // CMS
      if (bodyLower.includes('/wp-content/') || bodyLower.includes('/wp-includes/') || headers['x-wordpress-version']) {
        technologies.cms.push('WordPress');
      }
      if (bodyLower.includes('drupal.settings') || headers['x-drupal-cache']) technologies.cms.push('Drupal');
      if (bodyLower.includes('/media/jui/') || bodyLower.includes('joomla')) technologies.cms.push('Joomla');
      if (bodyLower.includes('ghost-post') || bodyLower.includes('ghost.url')) technologies.cms.push('Ghost');
      if (bodyLower.includes('shopify.com') || bodyLower.includes('shopify.theme')) technologies.cms.push('Shopify');
      if (bodyLower.includes('squarespace.com')) technologies.cms.push('Squarespace');
      if (bodyLower.includes('wix.com')) technologies.cms.push('Wix');

      // Framework
      if (bodyLower.includes('__next_data__') || bodyLower.includes('/_next/')) technologies.framework.push('Next.js');
      if (bodyLower.includes('__nuxt') || bodyLower.includes('/_nuxt/')) technologies.framework.push('Nuxt.js');
      if (bodyLower.includes('ng-version') || bodyLower.includes('ng-app')) technologies.framework.push('Angular');
      if (bodyLower.includes('data-reactroot') || bodyLower.includes('__react')) technologies.framework.push('React');
      if (bodyLower.includes('data-v-') || bodyLower.includes('__vue__')) technologies.framework.push('Vue.js');
      if (bodyLower.includes('data-svelte')) technologies.framework.push('Svelte');
      if (bodyLower.includes('__astro')) technologies.framework.push('Astro');
      if (bodyLower.includes('gatsby')) technologies.framework.push('Gatsby');

      // Language/runtime (from cookies)
      if (cookies.includes('PHPSESSID')) technologies.language.push('PHP');
      if (cookies.includes('JSESSIONID')) technologies.language.push('Java');
      if (cookies.includes('ASP.NET')) technologies.language.push('ASP.NET');
      if (cookies.includes('_rails_session')) technologies.language.push('Ruby on Rails');
      if (cookies.includes('laravel_session')) technologies.language.push('Laravel (PHP)');
      if (cookies.includes('express.sid') || cookies.includes('connect.sid')) technologies.language.push('Node.js/Express');
      if (cookies.includes('django')) technologies.language.push('Django (Python)');

      // Analytics
      if (bodyLower.includes('google-analytics.com') || bodyLower.includes('gtag(')) technologies.analytics.push('Google Analytics');
      if (bodyLower.includes('googletagmanager.com')) technologies.analytics.push('Google Tag Manager');
      if (bodyLower.includes('hotjar.com')) technologies.analytics.push('Hotjar');
      if (bodyLower.includes('matomo') || bodyLower.includes('piwik')) technologies.analytics.push('Matomo');
      if (bodyLower.includes('posthog')) technologies.analytics.push('PostHog');
      if (bodyLower.includes('mixpanel')) technologies.analytics.push('Mixpanel');
      if (bodyLower.includes('segment.com') || bodyLower.includes('segment.io')) technologies.analytics.push('Segment');
      if (bodyLower.includes('clarity.ms')) technologies.analytics.push('Microsoft Clarity');

      // Security
      if (bodyLower.includes('recaptcha')) technologies.security.push('reCAPTCHA');
      if (bodyLower.includes('hcaptcha')) technologies.security.push('hCaptcha');
      if (bodyLower.includes('turnstile')) technologies.security.push('Cloudflare Turnstile');

      // E-commerce
      if (bodyLower.includes('woocommerce')) technologies.ecommerce.push('WooCommerce');
      if (bodyLower.includes('magento')) technologies.ecommerce.push('Magento');
      if (bodyLower.includes('prestashop')) technologies.ecommerce.push('PrestaShop');

      // Meta generator tag
      const generatorMatch = body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)["']/i);
      if (generatorMatch) {
        const generator = generatorMatch[1];
        const alreadyDetected = Object.values(technologies).flat().some(t =>
          generator.toLowerCase().includes(t.toLowerCase())
        );
        if (!alreadyDetected) technologies.cms.push(generator);
      }

      // Build relationships
      for (const [category, techs] of Object.entries(technologies)) {
        for (const tech of techs) {
          relationships.push({ source: target, target: tech, type: 'uses_technology', label: category });
        }
      }

      return {
        moduleId: 'tech-profiler',
        name: 'Technology Profiler',
        status: 'success',
        data: { technologies, totalDetected: Object.values(technologies).flat().length },
        relationships,
        duration: Date.now() - start,
      };
    } catch (err) {
      return buildErrorResult(Date.now() - start, err);
    }
  },
};
