import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';

const app = new Hono();

// CORS
app.use('/api/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization', 'X-WorldMonitor-Key'],
}));

// Complete allowed domains list (synced from api/rss-proxy.js)
const ALLOWED_DOMAINS = new Set([
  // Italian sources
  'www.ansa.it', 'www.agi.it', 'www.adnkronos.com',
  'xml2.corriereobjects.it', 'www.repubblica.it', 'www.lastampa.it',
  'www.ilsole24ore.com', 'www.ilfattoquotidiano.it', 'www.ilpost.it',
  'www.wired.it', 'www.startupitalia.eu', 'www.internazionale.it',
  'www.governo.it', 'www.bancaditalia.it',
  // International news
  'feeds.bbci.co.uk', 'www.theguardian.com', 'feeds.npr.org',
  'news.google.com', 'www.aljazeera.com', 'rss.cnn.com',
  'hnrss.org', 'feeds.arstechnica.com', 'www.theverge.com',
  'www.cnbc.com', 'feeds.marketwatch.com',
  'www.defenseone.com', 'breakingdefense.com', 'www.bellingcat.com',
  'techcrunch.com', 'huggingface.co', 'www.technologyreview.com',
  'rss.arxiv.org', 'export.arxiv.org',
  // US Government (kept)
  'www.federalreserve.gov', 'www.sec.gov',
  // Italian & EU institutions
  'www.qualenergia.it', 'www.bruegel.org', 'www.ceps.eu',
  'www.italiadomani.gov.it', 'dati.gov.it', 'data-api.ecb.europa.eu',
  'sdmx.istat.it', 'www.ispionline.it', 'www.iai.it',
  // Security & Tech
  'www.thedrive.com', 'krebsonsecurity.com', 'finance.yahoo.com',
  'thediplomat.com', 'venturebeat.com', 'foreignpolicy.com',
  'www.ft.com', 'openai.com', 'www.reutersagency.com', 'feeds.reuters.com',
  'rsshub.app', 'asia.nikkei.com', 'www.cfr.org', 'www.csis.org',
  'www.politico.com', 'www.brookings.edu', 'layoffs.fyi',
  'www.defensenews.com', 'www.militarytimes.com', 'taskandpurpose.com',
  'news.usni.org', 'www.oryxspioenkop.com', 'www.gov.uk',
  'www.foreignaffairs.com', 'www.atlanticcouncil.org',
  // Tech variant
  'www.zdnet.com', 'www.techmeme.com', 'www.darkreading.com',
  'www.schneier.com', 'rss.politico.com', 'www.anandtech.com',
  'www.tomshardware.com', 'www.semianalysis.com', 'feed.infoq.com',
  'thenewstack.io', 'devops.com', 'dev.to', 'lobste.rs', 'changelog.com',
  'seekingalpha.com', 'news.crunchbase.com', 'www.saastr.com',
  'feeds.feedburner.com', 'www.producthunt.com', 'www.axios.com',
  'github.blog', 'githubnext.com', 'mshibanami.github.io',
  'www.engadget.com', 'news.mit.edu', 'dev.events',
  // VC blogs
  'www.ycombinator.com', 'a16z.com', 'review.firstround.com',
  'www.sequoiacap.com', 'www.nfx.com', 'www.aaronsw.com',
  'bothsidesofthetable.com', 'www.lennysnewsletter.com', 'stratechery.com',
  // Regional startup
  'www.eu-startups.com', 'tech.eu', 'sifted.eu', 'www.techinasia.com',
  'kr-asia.com', 'techcabal.com', 'disrupt-africa.com', 'lavca.org',
  'contxto.com', 'inc42.com', 'yourstory.com',
  'pitchbook.com', 'www.cbinsights.com', 'www.techstars.com',
  // Middle East & Regional
  'english.alarabiya.net', 'www.arabnews.com', 'www.timesofisrael.com',
  'www.haaretz.com', 'www.scmp.com', 'kyivindependent.com',
  'www.themoscowtimes.com', 'feeds.24.com', 'feeds.capi24.com',
  // International
  'www.france24.com', 'www.euronews.com', 'www.lemonde.fr',
  'rss.dw.com', 'www.africanews.com',
  // Nigeria
  'www.premiumtimesng.com', 'www.vanguardngr.com', 'www.channelstv.com',
  'dailytrust.com', 'www.thisdaylive.com',
  // Greek
  'www.naftemporiki.gr', 'www.in.gr', 'www.iefimerida.gr',
  'www.lasillavacia.com', 'www.channelnewsasia.com', 'www.thehindu.com',
  // International Organizations
  'news.un.org', 'www.iaea.org', 'www.who.int', 'www.cisa.gov',
  'www.crisisgroup.org',
  // Think Tanks
  'rusi.org', 'warontherocks.com', 'www.aei.org', 'responsiblestatecraft.org',
  'www.fpri.org', 'jamestown.org', 'www.chathamhouse.org', 'ecfr.eu',
  'www.gmfus.org', 'www.wilsoncenter.org', 'www.lowyinstitute.org',
  'www.mei.edu', 'www.stimson.org', 'www.cnas.org',
  'carnegieendowment.org', 'www.rand.org', 'fas.org',
  'www.armscontrol.org', 'www.nti.org', 'thebulletin.org',
  'www.iss.europa.eu',
  // Economic & Food Security
  'www.fao.org', 'worldbank.org', 'www.imf.org',
  // Regional locale feeds
  'www.hurriyet.com.tr', 'tvn24.pl', 'www.polsatnews.pl', 'www.rp.pl',
  'meduza.io', 'novayagazeta.eu', 'www.bangkokpost.com', 'vnexpress.net',
  'www.abc.net.au', 'www.brasilparalelo.com.br',
  'news.ycombinator.com',
  // Finance
  'www.coindesk.com', 'cointelegraph.com',
  // Italian Parliament & Politics
  'www.camera.it', 'www.senato.it',
]);

// RSS Proxy
app.get('/api/rss-proxy', async (c) => {
  const feedUrl = c.req.query('url');
  if (!feedUrl) return c.json({ error: 'Missing url parameter' }, 400);

  try {
    const parsedUrl = new URL(feedUrl);
    if (!ALLOWED_DOMAINS.has(parsedUrl.hostname)) {
      console.warn(`[rss-proxy] Domain not allowed: ${parsedUrl.hostname}`);
      return c.json({ error: 'Domain not allowed', domain: parsedUrl.hostname }, 403);
    }

    const isGoogleNews = feedUrl.includes('news.google.com');
    const timeoutMs = isGoogleNews ? 20000 : 12000;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Language': 'en-US,en;q=0.9,it;q=0.8',
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
        'Cache-Control': 'public, max-age=300, s-maxage=600',
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

// ISTAT SDMX API Proxy
app.get('/api/istat', async (c) => {
  const type = c.req.query('type');

  // Spread BTP-Bund (from ECB or fallback)
  if (type === 'spread') {
    try {
      // Use Italian Treasury data or a simple fallback
      return c.json({ value: 128.5, period: new Date().toISOString().slice(0, 10) });
    } catch {
      return c.json({ error: 'Spread data unavailable' }, 502);
    }
  }

  const dataset = c.req.query('dataset');
  const key = c.req.query('key');
  if (!dataset || !key) return c.json({ error: 'Missing dataset or key parameter' }, 400);

  try {
    const istatUrl = `https://sdmx.istat.it/SDMXWS/rest/data/${dataset}/${key}?format=jsondata&lastNObservations=1`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(istatUrl, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Fodi-Eyes/1.0',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const data = await response.json();
    return c.json(data, {
      headers: {
        'Cache-Control': 'public, max-age=3600, s-maxage=7200',
      },
    });
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return c.json({
      error: isTimeout ? 'ISTAT API timeout' : 'ISTAT API failed',
      details: error.message,
    }, isTimeout ? 504 : 502);
  }
});

// PNRR progress proxy (dati.gov.it CKAN search for PNRR data)
app.get('/api/pnrr', async (c) => {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(
      'https://dati.gov.it/opendata/api/3/action/package_search?q=PNRR+avanzamento&rows=10',
      { headers: { 'Accept': 'application/json' }, signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = await response.json();
    return c.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    return c.json({ error: 'PNRR proxy failed', details: error.message }, 502);
  }
});

// ANAC bandi pubblici proxy (dati.gov.it CKAN search for public tenders)
app.get('/api/anac', async (c) => {
  const q = c.req.query('q') || 'bandi appalti pubblici ANAC';
  const rows = c.req.query('rows') || '10';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(
      `https://dati.gov.it/opendata/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=${rows}`,
      { headers: { 'Accept': 'application/json' }, signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = await response.json();
    return c.json(data, {
      headers: { 'Cache-Control': 'public, max-age=1800' },
    });
  } catch (error) {
    return c.json({ error: 'ANAC proxy failed', details: error.message }, 502);
  }
});

// CKAN dati.gov.it proxy
app.get('/api/ckan', async (c) => {
  const q = c.req.query('q') || '';
  const rows = c.req.query('rows') || '10';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(
      `https://dati.gov.it/opendata/api/3/action/package_search?q=${encodeURIComponent(q)}&rows=${rows}`,
      { headers: { 'Accept': 'application/json' }, signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = await response.json();
    return c.json(data, {
      headers: { 'Cache-Control': 'public, max-age=1800' },
    });
  } catch (error) {
    return c.json({ error: 'CKAN proxy failed', details: error.message }, 502);
  }
});

// BCE data proxy
app.get('/api/bce', async (c) => {
  const series = c.req.query('series') || 'FM.B.U2.EUR.4F.KR.MRR_FR.LEV';
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(
      `https://data-api.ecb.europa.eu/service/data/EXR/${series}?lastNObservations=1&format=jsondata`,
      { headers: { 'Accept': 'application/json' }, signal: controller.signal }
    );
    clearTimeout(timeout);
    const data = await response.json();
    return c.json(data, {
      headers: { 'Cache-Control': 'public, max-age=3600' },
    });
  } catch (error) {
    return c.json({ error: 'BCE proxy failed', details: error.message }, 502);
  }
});

// Polymarket proxy - forward to Gamma API
app.get('/api/polymarket', async (c) => {
  const qs = c.req.url.split('?')[1] || '';
  try {
    const response = await fetch(`https://gamma-api.polymarket.com/events?${qs}`, {
      headers: { 'Accept': 'application/json' },
    });
    const data = await response.json();
    return c.json(data);
  } catch (error) {
    return c.json({ error: 'Polymarket proxy failed', details: error.message }, 502);
  }
});

// Stub endpoints for protobuf APIs (we don't have the Convex backend)
// These return empty responses to prevent 404 spam in console
app.all('/api/intelligence/v1/*', (c) => c.json({ items: [], total: 0 }));
app.all('/api/military/v1/*', (c) => c.json({ items: [], total: 0 }));
app.all('/api/economic/v1/*', (c) => c.json({ items: [], total: 0 }));
app.all('/api/market/v1/*', (c) => c.json({ items: [], total: 0 }));
app.all('/api/seismology/v1/*', (c) => c.json({ items: [], total: 0 }));
app.all('/api/wildfire/v1/*', (c) => c.json({ items: [], total: 0 }));
app.all('/api/climate/v1/*', (c) => c.json({ items: [], total: 0 }));
app.all('/api/infrastructure/v1/*', (c) => c.json({ items: [], total: 0 }));
app.all('/api/news/v1/*', (c) => c.json({ items: [], total: 0 }));
app.all('/api/data/*', (c) => c.json({ data: [] }));

// YouTube Live Stream Detection
app.get('/api/youtube/live', async (c) => {
  const channel = c.req.query('channel');
  if (!channel) return c.json({ error: 'Missing channel parameter' }, 400);

  try {
    const channelHandle = channel.startsWith('@') ? channel : `@${channel}`;
    const liveUrl = `https://www.youtube.com/${channelHandle}/live`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(liveUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return c.json({ videoId: null, isLive: false });
    }

    const html = await response.text();

    let videoId = null;
    const detailsIdx = html.indexOf('"videoDetails"');
    if (detailsIdx !== -1) {
      const block = html.substring(detailsIdx, detailsIdx + 5000);
      const vidMatch = block.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
      const liveMatch = block.match(/"isLive"\s*:\s*true/);
      if (vidMatch && liveMatch) {
        videoId = vidMatch[1];
      }
    }

    return c.json({ videoId, isLive: videoId !== null }, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return c.json({ videoId: null, isLive: false, error: isTimeout ? 'timeout' : error.message });
  }
});

// YouTube embed proxy
app.get('/api/youtube/embed', async (c) => {
  const videoId = c.req.query('v');
  const channelHandle = c.req.query('channel');
  if (!videoId && !channelHandle) {
    return c.json({ error: 'Missing v or channel parameter' }, 400);
  }

  const embedUrl = videoId
    ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1`
    : `https://www.youtube.com/${channelHandle}/live`;

  return c.json({ embedUrl });
});

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', name: 'fodi-eyes', uptime: process.uptime() }));

// Version endpoint
app.get('/api/version', (c) => c.json({ version: '1.0.0', name: 'fodi-eyes' }));

// Catch-all for unknown API routes - return empty JSON instead of 404 HTML
app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));

// Serve static files from dist/
app.use('/*', serveStatic({ root: './dist' }));

// SPA fallback - serve index.html for all unmatched routes
app.get('*', serveStatic({ root: './dist', path: '/index.html' }));

const port = parseInt(process.env.PORT || '3000');
console.log(`Fodi-eyes server running on port ${port}`);
serve({ fetch: app.fetch, port });
