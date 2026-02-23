import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}));

// Italian RSS feed domains (superset including Italian sources)
const ALLOWED_DOMAINS = [
  // Italian sources
  'www.ansa.it', 'www.agi.it', 'www.adnkronos.com',
  'xml2.corriereobjects.it', 'www.repubblica.it', 'www.lastampa.it',
  'www.ilsole24ore.com', 'www.ilfattoquotidiano.it', 'www.ilpost.it',
  'www.wired.it', 'www.startupitalia.eu', 'www.internazionale.it',
  'www.governo.it', 'www.bancaditalia.it',
  // International (kept from original)
  'feeds.bbci.co.uk', 'www.theguardian.com', 'feeds.npr.org',
  'news.google.com', 'www.aljazeera.com', 'rss.cnn.com',
  'www.cnbc.com', 'feeds.marketwatch.com', 'feeds.reuters.com',
  'www.france24.com', 'www.euronews.com', 'rss.dw.com',
  'news.un.org', 'www.iaea.org', 'www.who.int',
  'www.ft.com', 'rsshub.app', 'www.politico.com',
  // Think tanks & research
  'ecfr.eu', 'www.iss.europa.eu', 'www.crisisgroup.org',
  'carnegieendowment.org', 'www.rand.org',
];

// RSS Proxy
app.get('/api/rss-proxy', async (c) => {
  const feedUrl = c.req.query('url');
  if (!feedUrl) return c.json({ error: 'Missing url parameter' }, 400);

  try {
    const parsedUrl = new URL(feedUrl);
    if (!ALLOWED_DOMAINS.includes(parsedUrl.hostname)) {
      return c.json({ error: 'Domain not allowed' }, 403);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Fodi-eyes/1.0)',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
      },
      signal: controller.signal,
      redirect: 'follow',
    });
    clearTimeout(timeout);

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=300',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return c.json({
      error: isTimeout ? 'Feed timeout' : 'Failed to fetch feed',
      details: error.message,
    }, isTimeout ? 504 : 502);
  }
});

// YouTube embed proxy
app.get('/api/youtube/embed', async (c) => {
  const videoId = c.req.query('v');
  const channelHandle = c.req.query('channel');
  if (!videoId && !channelHandle) {
    return c.json({ error: 'Missing v or channel parameter' }, 400);
  }

  // Just return the embed URL - the client handles iframe creation
  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1`
    : `https://www.youtube.com/${channelHandle}/live`;

  return c.json({ embedUrl });
});

// Version endpoint
app.get('/api/version', (c) => {
  return c.json({ version: '1.0.0', name: 'fodi-eyes' });
});

// Serve static files from dist/
app.use('/*', serveStatic({ root: './dist' }));

// SPA fallback - serve index.html for all unmatched routes
app.get('*', serveStatic({ root: './dist', path: '/index.html' }));

const port = parseInt(process.env.PORT || '3000');
console.log(`Fodi-eyes server running on port ${port}`);
serve({ fetch: app.fetch, port });
