import type { ScanModule, ModuleResult, Relationship } from '../types.js';

const PLATFORMS = [
  { name: 'GitHub', url: 'https://github.com/{username}', check: 'github.com' },
  { name: 'Twitter/X', url: 'https://x.com/{username}', check: 'x.com' },
  { name: 'Instagram', url: 'https://www.instagram.com/{username}/', check: 'instagram.com' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/in/{username}/', check: 'linkedin.com' },
  { name: 'Reddit', url: 'https://www.reddit.com/user/{username}', check: 'reddit.com' },
  { name: 'YouTube', url: 'https://www.youtube.com/@{username}', check: 'youtube.com' },
  { name: 'TikTok', url: 'https://www.tiktok.com/@{username}', check: 'tiktok.com' },
  { name: 'Pinterest', url: 'https://www.pinterest.com/{username}/', check: 'pinterest.com' },
  { name: 'Medium', url: 'https://medium.com/@{username}', check: 'medium.com' },
  { name: 'DevTo', url: 'https://dev.to/{username}', check: 'dev.to' },
  { name: 'Telegram', url: 'https://t.me/{username}', check: 't.me' },
  { name: 'HackerNews', url: 'https://news.ycombinator.com/user?id={username}', check: 'news.ycombinator.com' },
  { name: 'Mastodon', url: 'https://mastodon.social/@{username}', check: 'mastodon.social' },
  { name: 'Keybase', url: 'https://keybase.io/{username}', check: 'keybase.io' },
];

export const socialLookupModule: ScanModule = {
  id: 'social-lookup',
  name: 'Social Media Lookup',
  description: 'Check username existence across social platforms',
  targetTypes: ['username'],

  async run(target: string, signal: AbortSignal): Promise<ModuleResult> {
    const start = Date.now();
    const relationships: Relationship[] = [];
    const found: Array<{ platform: string; url: string; status: number }> = [];
    const notFound: string[] = [];

    const BATCH_SIZE = 4;
    for (let i = 0; i < PLATFORMS.length; i += BATCH_SIZE) {
      if (signal.aborted) break;
      const batch = PLATFORMS.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(
        batch.map(async (platform) => {
          const url = platform.url.replace('{username}', encodeURIComponent(target));
          try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            signal.addEventListener('abort', () => controller.abort());
            const res = await fetch(url, {
              method: 'HEAD',
              redirect: 'follow',
              signal: controller.signal,
              headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            });
            clearTimeout(timeout);
            return { platform: platform.name, url, status: res.status, found: res.status < 400 };
          } catch {
            return { platform: platform.name, url, status: 0, found: false };
          }
        })
      );
      for (const r of results) {
        if (r.status === 'fulfilled') {
          if (r.value.found) {
            found.push({ platform: r.value.platform, url: r.value.url, status: r.value.status });
            relationships.push({ source: target, target: r.value.platform, type: 'has_account_on' });
          } else {
            notFound.push(r.value.platform);
          }
        }
      }
    }

    return {
      moduleId: 'social-lookup',
      name: 'Social Media Lookup',
      status: found.length > 0 ? 'success' : 'partial',
      data: { found, notFound, totalChecked: PLATFORMS.length },
      relationships,
      duration: Date.now() - start,
    };
  },
};
