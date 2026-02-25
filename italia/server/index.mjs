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
  'www.france24.com', 'www.euronews.com', 'it.euronews.com', 'www.lemonde.fr',
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

// In-memory cache helper — used by live API endpoints below
const apiCache = new Map();
function cachedFetch(key, ttlMs, fetchFn) {
  const cached = apiCache.get(key);
  if (cached && Date.now() - cached.ts < ttlMs) return Promise.resolve(cached.data);
  return fetchFn().then(data => {
    apiCache.set(key, { data, ts: Date.now() });
    if (apiCache.size > 100) {
      const oldest = [...apiCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
      if (oldest) apiCache.delete(oldest[0]);
    }
    return data;
  }).catch(err => {
    if (cached) return cached.data;
    throw err;
  });
}

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

// ── Spread BTP-Bund — live from Yahoo Finance (IT10Y=RR vs DE10Y=RR) ─────────
app.get('/api/spread', async (c) => {
  try {
    const spreadData = await cachedFetch('btp-spread', 30 * 60 * 1000, async () => {
      const [btpRes, bundRes] = await Promise.all([
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/IT10Y%3DRR?interval=1d&range=5d'),
        fetch('https://query1.finance.yahoo.com/v8/finance/chart/DE10Y%3DRR?interval=1d&range=5d'),
      ]);
      const btpData  = await btpRes.json();
      const bundData = await bundRes.json();
      const period   = new Date().toISOString().slice(0, 10);

      function extractLastClose(d) {
        try {
          const closes = d?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
          const valid  = closes.filter(v => v != null);
          return valid.at(-1) ?? d?.chart?.result?.[0]?.meta?.regularMarketPrice ?? null;
        } catch { return null; }
      }

      const btpYield  = extractLastClose(btpData);
      const bundYield = extractLastClose(bundData);

      if (btpYield != null && bundYield != null) {
        return {
          value: Math.round((btpYield - bundYield) * 100),
          btpYield, bundYield, period,
          source: 'Yahoo Finance',
        };
      }
      return { value: 128, period, source: 'fallback' };
    });
    return c.json(spreadData);
  } catch {
    return c.json({ error: 'Spread data unavailable' }, 502);
  }
});

// ISTAT SDMX API Proxy
app.get('/api/istat', async (c) => {
  const type = c.req.query('type');

  // Legacy: keep /api/istat?type=spread working as redirect
  if (type === 'spread') {
    return c.redirect('/api/spread');
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

// ── LIVE API ENDPOINTS ────────────────────────────────────────────────────────

// ── Seismology — USGS + INGV (free, no key required) ──────────────────────────
app.post('/api/seismology/v1/list-earthquakes', async (c) => {
  try {
    const items = await cachedFetch('earthquakes', 5 * 60 * 1000, async () => {
      const [usgsRes, ingvRes] = await Promise.all([
        fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_week.geojson'),
        fetch('https://webservices.ingv.it/fdsnws/event/1/query?format=geojson&minmag=2&maxlat=47.1&minlat=36.6&maxlon=18.5&minlon=6.6&limit=100&orderby=time'),
      ]);

      const usgs = await usgsRes.json();
      const ingv = await ingvRes.json().catch(() => ({ features: [] }));
      const quakes = [];

      for (const f of (usgs.features || [])) {
        const p = f.properties;
        const [lon, lat, depth] = f.geometry.coordinates;
        quakes.push({
          id: f.id,
          source: 'USGS',
          magnitude: p.mag,
          place: p.place,
          time: new Date(p.time).toISOString(),
          lat, lon, depth,
          url: p.url,
          tsunami: p.tsunami === 1,
          felt: p.felt || 0,
          significance: p.sig,
        });
      }

      for (const f of (ingv.features || [])) {
        const p = f.properties;
        const [lon, lat, depth] = f.geometry.coordinates;
        const isDuplicate = quakes.some(q =>
          Math.abs(q.lat - lat) < 0.1 &&
          Math.abs(q.lon - lon) < 0.1 &&
          Math.abs(new Date(q.time).getTime() - new Date(p.time).getTime()) < 60000
        );
        if (!isDuplicate) {
          quakes.push({
            id: `ingv-${f.id || p.eventId}`,
            source: 'INGV',
            magnitude: p.mag,
            place: p.place || p.region || 'Italia',
            time: new Date(p.time).toISOString(),
            lat, lon, depth: depth || 0,
            url: p.url || `https://terremoti.ingv.it/event/${f.id}`,
            tsunami: false,
            felt: 0,
            significance: Math.round((p.mag || 0) * 100),
          });
        }
      }

      return quakes.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    });

    return c.json({ items, total: items.length });
  } catch (err) {
    return c.json({ items: [], total: 0, error: err.message });
  }
});

// ── Wildfire — NASA FIRMS (free API key required: NASA_FIRMS_API_KEY) ─────────
app.post('/api/wildfire/v1/list-fire-detections', async (c) => {
  try {
    const items = await cachedFetch('wildfires', 15 * 60 * 1000, async () => {
      const apiKey = process.env.NASA_FIRMS_API_KEY || 'DEMO_KEY';
      const bbox = '6,36,19,48'; // Europe + Mediterranean
      const res = await fetch(
        `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${apiKey}/VIIRS_SNPP_NRT/${bbox}/2`
      );
      const csv = await res.text();
      const lines = csv.trim().split('\n');
      if (lines.length < 2) return [];

      const headers = lines[0].split(',');
      const latIdx = headers.indexOf('latitude');
      const lonIdx = headers.indexOf('longitude');
      const brightIdx = headers.indexOf('bright_ti4');
      const dateIdx = headers.indexOf('acq_date');
      const timeIdx = headers.indexOf('acq_time');
      const confIdx = headers.indexOf('confidence');
      const frpIdx = headers.indexOf('frp');

      return lines.slice(1).map((line, i) => {
        const cols = line.split(',');
        return {
          id: `fire-${i}`,
          source: 'NASA FIRMS',
          lat: parseFloat(cols[latIdx]) || 0,
          lon: parseFloat(cols[lonIdx]) || 0,
          brightness: parseFloat(cols[brightIdx]) || 0,
          date: cols[dateIdx] || '',
          time: cols[timeIdx] || '',
          confidence: cols[confIdx] || 'nominal',
          frp: parseFloat(cols[frpIdx]) || 0,
        };
      }).filter(f => f.lat > 0 && f.lon > 0);
    });

    return c.json({ items, total: items.length });
  } catch (err) {
    return c.json({ items: [], total: 0, error: err.message });
  }
});

// ── Climate — Open-Meteo (free, no key required) ──────────────────────────────
app.post('/api/climate/v1/list-climate-anomalies', async (c) => {
  try {
    const items = await cachedFetch('climate', 60 * 60 * 1000, async () => {
      const cities = [
        { name: 'Roma',     lat: 41.9, lon: 12.5 },
        { name: 'Milano',   lat: 45.5, lon:  9.2 },
        { name: 'Napoli',   lat: 40.8, lon: 14.3 },
        { name: 'Palermo',  lat: 38.1, lon: 13.4 },
        { name: 'Torino',   lat: 45.1, lon:  7.7 },
        { name: 'Firenze',  lat: 43.8, lon: 11.3 },
        { name: 'Bologna',  lat: 44.5, lon: 11.3 },
        { name: 'Bari',     lat: 41.1, lon: 16.9 },
        { name: 'Cagliari', lat: 39.2, lon:  9.1 },
        { name: 'Venezia',  lat: 45.4, lon: 12.3 },
      ];

      const today   = new Date().toISOString().slice(0, 10);
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      const results = [];

      for (const city of cities) {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&timezone=Europe/Rome&start_date=${weekAgo}&end_date=${today}`
          );
          const data = await res.json();
          if (!data.daily) continue;

          const d = data.daily;
          const lastIdx = d.time.length - 1;
          const tempAvg7d = d.temperature_2m_max.reduce((a, b) => a + b, 0) / d.temperature_2m_max.length;

          results.push({
            id: `climate-${city.name.toLowerCase()}`,
            city: city.name,
            lat: city.lat,
            lon: city.lon,
            date: d.time[lastIdx],
            tempMax: d.temperature_2m_max[lastIdx],
            tempMin: d.temperature_2m_min[lastIdx],
            precipitation: d.precipitation_sum[lastIdx],
            windMax: d.windspeed_10m_max[lastIdx],
            tempAvg7d,
            tempAnomaly: d.temperature_2m_max[lastIdx] - tempAvg7d,
          });
        } catch { /* skip city on error */ }
      }

      return results;
    });

    return c.json({ items, total: items.length });
  } catch (err) {
    return c.json({ items: [], total: 0, error: err.message });
  }
});

// ── Infrastructure — Cloudflare Radar outages (requires CLOUDFLARE_API_TOKEN) ─
app.post('/api/infrastructure/v1/list-internet-outages', async (c) => {
  try {
    const items = await cachedFetch('outages', 15 * 60 * 1000, async () => {
      const cfToken = process.env.CLOUDFLARE_API_TOKEN;
      if (!cfToken) return [];

      const res = await fetch('https://api.cloudflare.com/client/v4/radar/annotations/outages?limit=25&format=json', {
        headers: { Authorization: `Bearer ${cfToken}` },
      });
      const data = await res.json();
      return (data.result?.annotations || []).map(a => ({
        id: a.id,
        description: a.description,
        locations: a.locations,
        startDate: a.startDate,
        endDate: a.endDate,
        scope: a.scope,
        eventType: a.eventType,
      }));
    });

    return c.json({ items, total: items.length });
  } catch (err) {
    return c.json({ items: [], total: 0, error: err.message });
  }
});

// ── Infrastructure — baseline snapshot stubs ─────────────────────────────────
app.post('/api/infrastructure/v1/record-baseline-snapshot', async (c) => {
  return c.json({ ok: true });
});

app.post('/api/infrastructure/v1/get-temporal-baseline', async (c) => {
  return c.json({ ok: true });
});

// ── Economic — Yahoo Finance major indices (free, no key required) ─────────────
app.post('/api/economic/v1/list-indicators', async (c) => {
  try {
    const items = await cachedFetch('economic', 30 * 60 * 1000, async () => {
      const symbols = [
        { symbol: '^FTSEMIB',  name: 'FTSE MIB',      region: 'Italy'     },
        { symbol: 'EURUSD=X',  name: 'EUR/USD',        region: 'Global'    },
        { symbol: '^STOXX50E', name: 'Euro Stoxx 50',  region: 'Europe'    },
        { symbol: '^GSPC',     name: 'S&P 500',        region: 'USA'       },
        { symbol: 'BTC-USD',   name: 'Bitcoin',        region: 'Crypto'    },
        { symbol: 'GC=F',      name: 'Gold',           region: 'Commodity' },
        { symbol: 'CL=F',      name: 'Crude Oil WTI',  region: 'Commodity' },
      ];

      const indicators = [];
      for (const s of symbols) {
        try {
          const res = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s.symbol)}?interval=1d&range=5d`
          );
          const data = await res.json();
          const result = data?.chart?.result?.[0];
          if (!result) continue;

          const meta = result.meta;
          const closes = result.indicators?.quote?.[0]?.close || [];
          const validCloses = closes.filter(v => v != null);
          const lastClose = validCloses.at(-1) ?? meta.regularMarketPrice;
          const prevClose = validCloses.at(-2) ?? meta.previousClose ?? lastClose;
          const change = lastClose - prevClose;
          const changePct = prevClose ? (change / prevClose) * 100 : 0;

          indicators.push({
            id: s.symbol,
            name: s.name,
            region: s.region,
            price: Math.round(lastClose * 100) / 100,
            change: Math.round(change * 100) / 100,
            changePct: Math.round(changePct * 100) / 100,
            currency: meta.currency || 'USD',
            marketState: meta.marketState || 'UNKNOWN',
          });
        } catch { /* skip symbol on error */ }
      }

      return indicators;
    });

    return c.json({ items, total: items.length });
  } catch (err) {
    return c.json({ items: [], total: 0, error: err.message });
  }
});

// ── Market — Yahoo Finance individual stock quotes ─────────────────────────────
app.post('/api/market/v1/list-quotes', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const symbols = (body.symbols || ['AAPL', 'GOOGL', 'MSFT', 'AMZN', 'META', 'TSLA', 'NVDA']).slice(0, 20);

    const items = [];
    for (const sym of symbols) {
      try {
        const res = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=5d`
        );
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        if (!result) continue;

        const meta = result.meta;
        const closes = result.indicators?.quote?.[0]?.close || [];
        const validCloses = closes.filter(v => v != null);
        const lastClose = validCloses.at(-1) ?? meta.regularMarketPrice;
        const prevClose = validCloses.at(-2) ?? meta.previousClose ?? lastClose;
        const change = lastClose - prevClose;
        const changePct = prevClose ? (change / prevClose) * 100 : 0;

        items.push({
          symbol: sym,
          price: Math.round(lastClose * 100) / 100,
          previousClose: Math.round(prevClose * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePct: Math.round(changePct * 100) / 100,
          currency: meta.currency,
          exchange: meta.exchangeName,
        });
      } catch { /* skip symbol on error */ }
    }

    return c.json({ items, total: items.length });
  } catch (err) {
    return c.json({ items: [], total: 0, error: err.message });
  }
});

// ── Intelligence — GDELT (free, no key) + ACLED (requires ACLED_ACCESS_TOKEN) ─
app.post('/api/intelligence/v1/list-events', async (c) => {
  try {
    const items = await cachedFetch('intelligence', 15 * 60 * 1000, async () => {
      const events = [];

      // GDELT — global event index, no key required
      try {
        const gdeltRes = await fetch(
          'https://api.gdeltproject.org/api/v2/doc/doc?query=Italy%20OR%20Italia&mode=ArtList&maxrecords=25&format=json&sort=DateDesc'
        );
        const gdelt = await gdeltRes.json();
        for (const art of (gdelt.articles || []).slice(0, 25)) {
          events.push({
            id: `gdelt-${art.url ? Buffer.from(art.url).toString('base64').slice(0, 12) : Math.random().toString(36).slice(2)}`,
            source: 'GDELT',
            title: art.title,
            url: art.url,
            domain: art.domain,
            language: art.language,
            seendate: art.seendate,
            socialimage: art.socialimage,
          });
        }
      } catch { /* GDELT unavailable */ }

      // ACLED — conflict/protest data, requires token
      const acledToken = process.env.ACLED_ACCESS_TOKEN;
      if (acledToken) {
        try {
          const today    = new Date().toISOString().slice(0, 10);
          const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
          const acledRes = await fetch(
            `https://api.acleddata.com/acled/read?key=${acledToken}&email=info@fodisrl.it&country=Italy&event_date=${monthAgo}|${today}&event_date_where=BETWEEN&limit=50`
          );
          const acled = await acledRes.json();
          for (const ev of (acled.data || [])) {
            events.push({
              id: `acled-${ev.data_id}`,
              source: 'ACLED',
              title: ev.notes || ev.event_type,
              eventType: ev.event_type,
              subEventType: ev.sub_event_type,
              date: ev.event_date,
              lat: parseFloat(ev.latitude),
              lon: parseFloat(ev.longitude),
              location: ev.location,
              region: ev.admin1,
              fatalities: parseInt(ev.fatalities) || 0,
              actors: [ev.actor1, ev.actor2].filter(Boolean).join(' vs '),
            });
          }
        } catch { /* ACLED unavailable */ }
      }

      return events;
    });

    return c.json({ items, total: items.length });
  } catch (err) {
    return c.json({ items: [], total: 0, error: err.message });
  }
});

// ── Military — OpenSky flight data (Italy bounding box) ───────────────────────
app.post('/api/military/v1/list-military-flights', async (c) => {
  try {
    const relayUrl = process.env.WS_RELAY_URL;

    if (!relayUrl) {
      const items = await cachedFetch('military-flights', 2 * 60 * 1000, async () => {
        const res = await fetch('https://opensky-network.org/api/states/all?lamin=36&lomin=6&lamax=47&lomax=19');
        if (!res.ok) return [];
        const data = await res.json();
        return (data.states || [])
          .filter(s => !s[8]) // filter out on-ground
          .map(s => ({
            icao24: s[0],
            callsign: (s[1] || '').trim(),
            originCountry: s[2],
            lon: s[5],
            lat: s[6],
            altitude: s[7] || s[13],
            onGround: s[8],
            velocity: s[9],
            heading: s[10],
            verticalRate: s[11],
            squawk: s[14] || null,
          }));
      });
      return c.json({ items, total: items.length });
    }

    const relayBase = relayUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const secret = process.env.RELAY_SHARED_SECRET;
    const headers = {};
    if (secret) {
      headers[process.env.RELAY_AUTH_HEADER || 'x-relay-key'] = secret;
      headers['Authorization'] = `Bearer ${secret}`;
    }
    const res = await fetch(`${relayBase}/opensky?lamin=36&lomin=6&lamax=47&lomax=19`, { headers });
    const data = await res.json();
    const items = (data.states || data || [])
      .filter(s => !s[8]) // filter out on-ground
      .map(s => ({
        icao24: s[0],
        callsign: (s[1] || '').trim(),
        originCountry: s[2],
        lon: s[5], lat: s[6],
        altitude: s[7],
        onGround: s[8],
        velocity: s[9],
        heading: s[10],
        verticalRate: s[11],
        squawk: s[14] || null,
      }));
    return c.json({ items, total: items.length });
  } catch (err) {
    return c.json({ items: [], total: 0, error: err.message });
  }
});

// ── All flights — OpenSky global flight data ─────────────────────────────────
app.post('/api/flights/global', async (c) => {
  try {
    const body = await c.req.json().catch(() => ({}));
    const bb = body.boundingBox || {};
    const sw = bb.southWest || { latitude: -90, longitude: -180 };
    const ne = bb.northEast || { latitude: 90, longitude: 180 };

    const cacheKey = `flights-global:${sw.latitude}:${sw.longitude}:${ne.latitude}:${ne.longitude}`;

    const items = await cachedFetch(cacheKey, 2 * 60 * 1000, async () => {
      const url = `https://opensky-network.org/api/states/all?lamin=${sw.latitude}&lamax=${ne.latitude}&lomin=${sw.longitude}&lomax=${ne.longitude}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        signal: AbortSignal.timeout(15000)
      });
      if (!res.ok) return [];
      const data = await res.json();
      return (data.states || [])
        .filter(s => !s[8] && s[5] != null && s[6] != null) // not on ground, has position
        .map(s => ({
          icao24: s[0],
          callsign: (s[1] || '').trim(),
          originCountry: s[2],
          lon: s[5],
          lat: s[6],
          altitude: s[7] || s[13],
          onGround: false,
          velocity: s[9],
          heading: s[10],
          verticalRate: s[11],
          squawk: s[14] || null,
        }));
    });
    return c.json({ items, total: items.length });
  } catch (err) {
    return c.json({ items: [], total: 0, error: err.message });
  }
});

// ── News — GDELT latest articles ──────────────────────────────────────────────
app.post('/api/news/v1/list-briefs', async (c) => {
  try {
    const items = await cachedFetch('news-briefs', 30 * 60 * 1000, async () => {
      const res = await fetch(
        'https://api.gdeltproject.org/api/v2/doc/doc?query=(Italy%20OR%20security%20OR%20defense%20OR%20intelligence)&mode=ArtList&maxrecords=50&format=json&sort=DateDesc'
      );
      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        // GDELT rate-limited or returned non-JSON (plain text error)
        return [];
      }
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch { return []; }
      return (data.articles || []).map(a => ({
        id: a.url ? Buffer.from(a.url).toString('base64').slice(0, 12) : '',
        title: a.title,
        url: a.url,
        source: a.domain,
        language: a.language,
        date: a.seendate,
        image: a.socialimage,
      }));
    });
    return c.json({ items, total: items.length });
  } catch (err) {
    return c.json({ items: [], total: 0, error: err.message });
  }
});

// Fallback for unimplemented data sub-routes
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

// Frame proxy - serves external pages without X-Frame-Options for inline embedding
const FRAME_PROXY_ALLOWED = new Set([
  'www.skylinewebcams.com', 'skylinewebcams.com',
  'meteowebcam.it', 'www.meteowebcam.it',
  'tg24.sky.it', 'video.sky.it', 'videoplatform.sky.it',
  'www.rainews.it', 'rainews.it',
  'tg.la7.it', 'www.la7.it',
  'www.serravalle.it', 'serravalle.it',
  'airportwebcams.net', 'www.airportwebcams.net',
]);

app.get('/api/frame-proxy', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.text('Missing url parameter', 400);

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return c.text('Invalid URL', 400);
  }

  if (!FRAME_PROXY_ALLOWED.has(parsedUrl.hostname)) {
    return c.text(`Domain not allowed: ${parsedUrl.hostname}`, 403);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const contentType = response.headers.get('content-type') || 'text/html';

    // For HTML content, inject base tag so relative URLs resolve correctly
    if (contentType.includes('text/html')) {
      let html = await response.text();
      const baseTag = `<base href="${parsedUrl.origin}${parsedUrl.pathname.substring(0, parsedUrl.pathname.lastIndexOf('/') + 1)}">`;
      html = html.replace(/<head([^>]*)>/i, `<head$1>${baseTag}`);

      return new Response(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=60',
          // Explicitly NO X-Frame-Options or CSP frame-ancestors
        },
      });
    }

    // Non-HTML: pass through
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=300',
      },
    });
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return c.text(isTimeout ? 'Timeout fetching page' : `Error: ${error.message}`, 502);
  }
});

// Italian TV HLS streams - resolve actual stream URLs dynamically
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function resolveRaiStream(cont = '1') {
  try {
    const res = await fetch(`https://mediapolis.rai.it/relinker/relinkerServlet.htm?cont=${cont}&output=56`, {
      headers: { 'User-Agent': 'rainet/4.0.5' },
    });
    const xml = await res.text();
    const match = xml.match(/CDATA\[(https:[^\]]+)\]/);
    return match ? match[1] : null;
  } catch { return null; }
}

async function resolveLa7Stream() {
  try {
    const res = await fetch('https://www.la7.it/dirette-tv', { headers: { 'User-Agent': UA } });
    const html = await res.text();
    const match = html.match(/"(https:\/\/d15umi5iaezxgx\.cloudfront\.net[^"]+\.m3u8[^"]*)"/);
    return match ? match[1] : null;
  } catch { return null; }
}

async function resolveSkyStream() {
  try {
    // Try the Sky API first
    const res = await fetch('https://apid.sky.it/vdp/v1/getLivestream?id=1', { headers: { 'User-Agent': UA } });
    const data = await res.json();
    if (data?.streaming_url) return data.streaming_url;
    // Fallback: try fetching signed URL from the tg24 page
    const pageRes = await fetch('https://tg24.sky.it/diretta', { headers: { 'User-Agent': UA } });
    const html = await pageRes.text();
    const match = html.match(/"(https:\/\/[^"]*akamaized\.net[^"]*\.m3u8[^"]*)"/);
    return match ? match[1] : null;
  } catch { return null; }
}

const ITALIAN_TV_STREAMS = {
  skytg24: { name: 'Sky TG24', resolve: resolveSkyStream },
  rainews: { name: 'Rai News 24', resolve: () => resolveRaiStream('1') },
  la7: { name: 'La7', resolve: resolveLa7Stream },
};

// Allowed domains for HLS proxy (whitelist known TV CDNs + webcam CDNs)
// Use suffix matching to cover all Akamai/CDN subdomains
const HLS_PROXY_ALLOWED_EXACT = new Set([
  'd15umi5iaezxgx.cloudfront.net',
  'mediapolis.rai.it', 'mediapolisevent.rai.it',
  'hd-auth.skylinewebcams.com',
]);
const HLS_PROXY_ALLOWED_SUFFIX = [
  '.akamaized.net',  // Sky, Rai (rainews1-live, hlslive-web-gcdn-skycdn-it, etc.)
  '.cloudfront.net',
  '.skylinewebcams.com', // webcam TS segments (hddn53.skylinewebcams.com, etc.)
];
function isHlsProxyAllowed(hostname) {
  if (HLS_PROXY_ALLOWED_EXACT.has(hostname)) return true;
  return HLS_PROXY_ALLOWED_SUFFIX.some(suffix => hostname.endsWith(suffix));
}

// HLS proxy - fetches m3u8/ts from CDN and serves without CORS issues
// Supports both ?url=<direct_url> and ?channel=<channel_id> (resolves dynamically)
app.get('/api/hls-proxy', async (c) => {
  let url = c.req.query('url');
  const channel = c.req.query('channel');

  // If channel is specified, resolve the stream URL dynamically (tokens expire quickly)
  if (!url && channel && ITALIAN_TV_STREAMS[channel]) {
    try {
      url = await ITALIAN_TV_STREAMS[channel].resolve();
    } catch { /* fall through */ }
  }

  if (!url) return c.text('Missing url parameter or unknown channel', 400);

  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { return c.text('Invalid URL', 400); }

  if (!isHlsProxyAllowed(parsedUrl.hostname)) {
    return c.text(`Domain not allowed: ${parsedUrl.hostname}`, 403);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    // For SkylineWebcams, use their own site as Origin/Referer to avoid copyright_violation responses
    const isSkyline = parsedUrl.hostname.endsWith('.skylinewebcams.com') || parsedUrl.hostname === 'skylinewebcams.com';
    const origin = isSkyline ? 'https://www.skylinewebcams.com' : parsedUrl.origin;
    const referer = isSkyline ? 'https://www.skylinewebcams.com/' : parsedUrl.origin + '/';

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': '*/*',
        'Accept-Language': 'it-IT,it;q=0.9,en;q=0.8',
        'Origin': origin,
        'Referer': referer,
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return c.text(`Upstream error: ${response.status}`, 502);
    }

    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    const finalUrl = response.url || url;

    // For m3u8 manifests, rewrite URLs to go through the proxy
    if (contentType.includes('mpegurl') || contentType.includes('m3u8') || finalUrl.includes('.m3u8') || contentType.includes('text/plain')) {
      let manifest = await response.text();
      // Check if it's actually an m3u8
      if (manifest.trim().startsWith('#EXTM3U') || manifest.includes('#EXT-X-')) {
        // For CloudFront signed URLs, child manifests need parent's query params
        const parentParsed = new URL(finalUrl);
        const parentQuery = parentParsed.search; // e.g. ?Expires=...&Signature=...

        function resolveManifestUrl(rawUrl) {
          let absoluteUrl;
          try {
            absoluteUrl = new URL(rawUrl, finalUrl).href;
          } catch {
            absoluteUrl = rawUrl.startsWith('http') ? rawUrl : finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1) + rawUrl;
          }
          // If the resolved URL has no query params but the parent did (signed URLs),
          // propagate parent's query params to child URLs on the same host
          try {
            const resolved = new URL(absoluteUrl);
            if (!resolved.search && parentQuery && resolved.hostname === parentParsed.hostname) {
              absoluteUrl = resolved.origin + resolved.pathname + parentQuery;
            }
          } catch { /* ignore */ }
          return '/api/hls-proxy?url=' + encodeURIComponent(absoluteUrl);
        }

        manifest = manifest.split('\n').map(line => {
          const trimmed = line.trim();
          if (trimmed === '') return line;
          // Rewrite URI attributes in #EXT-X-KEY and #EXT-X-MAP tags
          if (trimmed.startsWith('#') && trimmed.includes('URI="')) {
            return line.replace(/URI="([^"]+)"/g, (match, uri) => {
              try { return 'URI="' + resolveManifestUrl(uri) + '"'; }
              catch { return match; }
            });
          }
          if (trimmed.startsWith('#')) return line;
          return resolveManifestUrl(trimmed);
        }).join('\n');

        return new Response(manifest, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'no-cache',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      // Fallback: not actually m3u8, pass through
      return new Response(manifest, {
        status: 200,
        headers: { 'Content-Type': contentType || 'text/plain', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // For TS segments and other binary, stream through
    const body = await response.arrayBuffer();
    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType || 'video/mp2t',
        'Cache-Control': 'public, max-age=2',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return c.text(isTimeout ? 'Timeout' : `Error: ${error.message}`, 502);
  }
});

// Resolve HLS stream URL for Italian TV channel
// Returns channel-based proxy URL (tokens are resolved fresh by the proxy on each request)
app.get('/api/tv-stream', async (c) => {
  const channel = c.req.query('channel');
  if (!channel || !ITALIAN_TV_STREAMS[channel]) {
    return c.json({ error: 'Unknown channel', available: Object.keys(ITALIAN_TV_STREAMS) }, 400);
  }
  const config = ITALIAN_TV_STREAMS[channel];
  // Use channel-based proxy URL so tokens are resolved fresh each time
  return c.json({ channel, name: config.name, streamUrl: '/api/hls-proxy?channel=' + encodeURIComponent(channel) });
});

// Lightweight HLS player page (embedded via iframe)
app.get('/api/tv-player', (c) => {
  const channel = c.req.query('channel') || '';
  const name = ITALIAN_TV_STREAMS[channel]?.name || channel;
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${name} - Live</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000}
video{width:100%;height:100%;object-fit:contain}
.error{color:#ff4444;font-family:monospace;font-size:14px;display:flex;align-items:center;justify-content:center;height:100%;text-align:center;padding:20px}
.loading{color:#888;font-family:monospace;font-size:13px;display:flex;align-items:center;justify-content:center;height:100%;text-align:center;flex-direction:column;gap:12px}
.spinner{width:32px;height:32px;border:3px solid #333;border-top-color:#0f0;border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head><body>
<div id="root"><div class="loading"><div class="spinner"></div>Caricamento ${name}...</div></div>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js"></script>
<script>
(async function(){
  const root = document.getElementById('root');
  try {
    const res = await fetch('/api/tv-stream?channel=${channel}');
    const data = await res.json();
    if (!data.streamUrl) throw new Error('No stream URL');

    root.innerHTML = '';
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.controls = true;
    root.appendChild(video);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        xhrSetup: function(xhr) {
          // No need for special headers since we're fetching from our own server
        }
      });
      hls.loadSource(data.streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(()=>{}); });
      hls.on(Hls.Events.ERROR, (e, d) => {
        if (d.fatal) {
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.warn('HLS network error, retrying...', d);
            setTimeout(() => hls.startLoad(), 2000);
          } else {
            console.error('HLS fatal error:', d);
            root.innerHTML = '<div class="error">Stream non disponibile al momento.<br>Riprova tra qualche istante.</div>';
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = data.streamUrl;
      video.play().catch(()=>{});
    } else {
      root.innerHTML = '<div class="error">Browser non supporta HLS</div>';
    }
  } catch(e) {
    console.error('TV player error:', e);
    root.innerHTML = '<div class="error">Errore caricamento stream</div>';
  }
})();
</script>
</body></html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
});

// ── Webcam stream extraction ───────────────────────────────────────
// Extracts HLS stream URL from SkylineWebcams page HTML
// Pattern: source:'livee.m3u8?a=<stream_id>' → https://hd-auth.skylinewebcams.com/live.m3u8?a=<stream_id>
async function extractSkylineStream(pageUrl) {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(pageUrl, {
      headers: {
        'User-Agent': UA,
        'Accept': 'text/html',
        'Accept-Language': 'it-IT,it;q=0.9',
      },
      redirect: 'follow',
      signal: controller.signal,
    });
    clearTimeout(timeout);
    const html = await res.text();
    // Match: source: 'livee.m3u8?a=XXXXX' (with various quote styles)
    const match = html.match(/source\s*:\s*['"]livee\.m3u8\?a=([^'"]+)['"]/);
    if (match) {
      return { streamId: match[1], streamUrl: `https://hd-auth.skylinewebcams.com/live.m3u8?a=${match[1]}`, online: true };
    }
    // Fallback: try matching just the m3u8 URL directly
    const fallback = html.match(/hd-auth\.skylinewebcams\.com\/live\.m3u8\?a=([^'"&\s]+)/);
    if (fallback) {
      return { streamId: fallback[1], streamUrl: `https://hd-auth.skylinewebcams.com/live.m3u8?a=${fallback[1]}`, online: true };
    }
    return { streamId: null, streamUrl: null, online: false };
  } catch {
    return { streamId: null, streamUrl: null, online: false };
  }
}

// Webcam stream resolver - extracts and returns HLS stream URL
app.get('/api/webcam-stream', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.json({ error: 'Missing url parameter' }, 400);

  // SkylineWebcams
  if (url.includes('skylinewebcams.com')) {
    const result = await extractSkylineStream(url);
    if (result.online) {
      return c.json({
        ...result,
        // Use proxied URL so browser doesn't hit CORS issues
        proxyUrl: '/api/hls-proxy?url=' + encodeURIComponent(result.streamUrl),
      }, { headers: { 'Cache-Control': 'public, max-age=300' } });
    }
    return c.json({ online: false, error: 'Webcam offline or stream not found' });
  }

  return c.json({ error: 'Unsupported webcam portal' }, 400);
});

// Lightweight HLS webcam player page (embedded via iframe)
app.get('/api/webcam-player', (c) => {
  const url = c.req.query('url') || '';
  const title = c.req.query('title') || 'Webcam';
  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:100%;height:100%;overflow:hidden;background:#000}
video{width:100%;height:100%;object-fit:contain}
.error{color:#ff4444;font-family:monospace;font-size:13px;display:flex;align-items:center;justify-content:center;height:100%;text-align:center;padding:16px;flex-direction:column;gap:8px}
.error a{color:#44aaff;text-decoration:none}
.error a:hover{text-decoration:underline}
.loading{color:#888;font-family:monospace;font-size:13px;display:flex;align-items:center;justify-content:center;height:100%;text-align:center;flex-direction:column;gap:10px}
.spinner{width:28px;height:28px;border:3px solid #333;border-top-color:#0f0;border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
</style>
</head><body>
<div id="root"><div class="loading"><div class="spinner"></div>Caricamento webcam...</div></div>
<script src="https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js"></script>
<script>
(async function(){
  const root = document.getElementById('root');
  const webcamUrl = ${JSON.stringify(url)};
  const webcamTitle = ${JSON.stringify(title)};

  try {
    // Resolve stream URL from our API
    const res = await fetch('/api/webcam-stream?url=' + encodeURIComponent(webcamUrl));
    const data = await res.json();

    if (!data.online || !data.proxyUrl) {
      root.innerHTML = '<div class="error">Webcam offline<br><a href="' + webcamUrl + '" target="_blank">Apri sito webcam</a></div>';
      return;
    }

    root.innerHTML = '';
    const video = document.createElement('video');
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.controls = true;
    video.poster = '';
    root.appendChild(video);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        maxBufferLength: 15,
        maxMaxBufferLength: 30,
        liveSyncDurationCount: 3,
        liveMaxLatencyDurationCount: 6,
      });
      hls.loadSource(data.proxyUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(()=>{}); });
      hls.on(Hls.Events.ERROR, (e, d) => {
        if (d.fatal) {
          if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
            setTimeout(() => hls.startLoad(), 3000);
          } else {
            root.innerHTML = '<div class="error">Stream non disponibile<br><a href="' + webcamUrl + '" target="_blank">Apri sito webcam</a></div>';
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = data.proxyUrl;
      video.play().catch(()=>{});
    } else {
      root.innerHTML = '<div class="error">Browser non supporta HLS<br><a href="' + webcamUrl + '" target="_blank">Apri sito webcam</a></div>';
    }
  } catch(e) {
    console.error('Webcam player error:', e);
    root.innerHTML = '<div class="error">Errore caricamento webcam<br><a href="' + webcamUrl + '" target="_blank">Apri sito webcam</a></div>';
  }
})();
</script>
</body></html>`;
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
});

// ── OSINT Scanner Proxy ──
// Forward /api/osint/* requests to the osint-scanner container
const OSINT_BACKEND = process.env.OSINT_BACKEND_URL || 'http://osint:3003';

app.all('/api/osint/*', async (c) => {
  try {
    const url = new URL(c.req.url, `http://localhost`);
    const targetUrl = `${OSINT_BACKEND}${url.pathname}${url.search}`;

    const headers = {};
    c.req.raw.headers.forEach((value, key) => {
      if (key !== 'host') headers[key] = value;
    });

    const init = {
      method: c.req.method,
      headers,
    };

    // Forward body for POST/PUT/PATCH
    if (['POST', 'PUT', 'PATCH'].includes(c.req.method)) {
      init.body = await c.req.text();
    }

    const resp = await fetch(targetUrl, init);
    const body = await resp.arrayBuffer();

    const respHeaders = {};
    resp.headers.forEach((value, key) => {
      respHeaders[key] = value;
    });

    return new Response(body, {
      status: resp.status,
      headers: respHeaders,
    });
  } catch (error) {
    return c.json({
      error: 'OSINT scanner unavailable',
      details: error.message,
    }, 502);
  }
});

// Health check
app.get('/api/health', (c) => c.json({ status: 'ok', name: 'fodi-eyes', uptime: process.uptime() }));

// Version endpoint
app.get('/api/version', (c) => c.json({ version: '1.0.0', name: 'fodi-eyes' }));

// ── News Summarization via OpenRouter ──
app.post('/api/news/v1/summarize-article', async (c) => {
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  if (!OPENROUTER_API_KEY) {
    return c.json({ summary: '', provider: 'openrouter', model: '', cached: false, tokens: 0, fallback: true, skipped: true, reason: 'OPENROUTER_API_KEY not configured', error: '', errorType: '' });
  }

  try {
    const body = await c.req.json();
    const { provider = 'openrouter', headlines = [], mode = 'brief', variant = 'full', lang = 'it', geoContext = '' } = body;

    if (!headlines.length) {
      return c.json({ summary: '', provider, model: '', cached: false, tokens: 0, fallback: false, skipped: false, reason: '', error: 'Headlines array required', errorType: 'ValidationError' });
    }

    // Only OpenRouter supported in this deployment
    if (provider !== 'openrouter') {
      return c.json({ summary: '', provider, model: '', cached: false, tokens: 0, fallback: true, skipped: true, reason: `Provider ${provider} not available`, error: '', errorType: '' });
    }

    const sanitized = headlines.slice(0, 10).map(h => typeof h === 'string' ? h.slice(0, 500) : '');
    const headlineText = sanitized.map((h, i) => `${i + 1}. ${h}`).join('\n');
    const dateContext = `Current date: ${new Date().toISOString().split('T')[0]}.`;
    const langInstruction = lang && lang !== 'en' ? `\nIMPORTANT: Output the summary in ${lang.toUpperCase()} language.` : '';

    let systemPrompt, userPrompt;
    if (mode === 'brief') {
      systemPrompt = `${dateContext}\n\nSummarize the key development in 2-3 sentences.\nRules:\n- Lead with WHAT happened and WHERE - be specific\n- NEVER start with "Breaking news" or TV-style openings\n- Start directly with the subject\n- No bullet points, no meta-commentary${langInstruction}`;
      userPrompt = `Summarize the top story:\n${headlineText}${geoContext ? '\n\n' + geoContext : ''}`;
    } else if (mode === 'analysis') {
      systemPrompt = `${dateContext}\n\nProvide analysis in 2-3 sentences. Be direct and specific.${langInstruction}`;
      userPrompt = `What's the key pattern or risk?\n${headlineText}${geoContext ? '\n\n' + geoContext : ''}`;
    } else if (mode === 'translate') {
      systemPrompt = `You are a professional news translator. Translate into ${variant}. Output ONLY the translated text.`;
      userPrompt = `Translate to ${variant}:\n${headlines[0]}`;
    } else {
      systemPrompt = `${dateContext}\n\nSynthesize in 2 sentences max.${langInstruction}`;
      userPrompt = `Key takeaway:\n${headlineText}`;
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fodi-eyes.fodivps2.cloud',
        'X-Title': 'FODI Eyes',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        max_tokens: 150,
        top_p: 0.9,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SummarizeArticle] API error:', response.status, errorText);
      return c.json({ summary: '', provider: 'openrouter', model: '', cached: false, tokens: 0, fallback: true, skipped: false, reason: '', error: `API error ${response.status}`, errorType: '' });
    }

    const data = await response.json();
    let summary = (data.choices?.[0]?.message?.content || '').trim();
    summary = summary.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    return c.json({
      summary,
      model: data.model || 'google/gemini-3-flash-preview',
      provider: 'openrouter',
      cached: false,
      tokens: data.usage?.total_tokens || 0,
      fallback: false,
      skipped: false,
      reason: '',
      error: '',
      errorType: '',
    });
  } catch (err) {
    console.error('[SummarizeArticle] Error:', err.message);
    return c.json({ summary: '', provider: 'openrouter', model: '', cached: false, tokens: 0, fallback: true, skipped: false, reason: '', error: err.message, errorType: err.name || 'Error' });
  }
});

// ── Military — Theater Posture (OpenSky global military flights analysis) ─────
const MILITARY_PREFIXES = [
  'RCH', 'REACH', 'MOOSE', 'EVAC', 'DUSTOFF', 'PEDRO',
  'DUKE', 'HAVOC', 'KNIFE', 'WARHAWK', 'VIPER', 'RAGE', 'FURY',
  'SHELL', 'TEXACO', 'ARCO', 'ESSO', 'PETRO',
  'SENTRY', 'AWACS', 'MAGIC', 'DISCO', 'DARKSTAR',
  'COBRA', 'PYTHON', 'RAPTOR', 'EAGLE', 'HAWK', 'TALON',
  'BOXER', 'OMNI', 'TOPCAT', 'SKULL', 'REAPER', 'HUNTER',
  'ARMY', 'NAVY', 'USAF', 'USMC', 'USCG',
  'AE', 'CNV', 'PAT', 'SAM', 'EXEC',
  'NATO', 'GAF', 'RRF', 'RAF', 'FAF', 'IAF', 'RNLAF', 'BAF', 'DAF', 'HAF', 'PAF',
  'SWORD', 'LANCE', 'ARROW', 'SPARTAN',
  'RSAF', 'EMIRI', 'UAEAF', 'KAF', 'QAF', 'BAHAF', 'OMAAF',
  'IRIAF', 'IRG', 'IRGC', 'TAF', 'TUAF',
  'RSD', 'RF', 'RFF', 'VKS', 'CHN', 'PLAAF', 'PLA',
];
const AIRLINE_CODES_SET = new Set([
  'SVA', 'QTR', 'THY', 'UAE', 'ETD', 'GFA', 'MEA', 'RJA', 'KAC', 'ELY',
  'IAW', 'IRA', 'MSR', 'SYR', 'PGT', 'AXB', 'FDB', 'KNE', 'FAD', 'ADY', 'OMA',
  'BAW', 'AFR', 'DLH', 'KLM', 'AUA', 'SAS', 'FIN', 'LOT', 'AZA', 'TAP', 'IBE',
  'VLG', 'RYR', 'EZY', 'WZZ', 'NOZ', 'BEL', 'AEE', 'ROT',
  'AIC', 'CPA', 'SIA', 'MAS', 'THA', 'VNM', 'JAL', 'ANA', 'KAL', 'AAR', 'EVA',
  'AAL', 'DAL', 'UAL', 'SWA', 'JBU', 'ASA', 'NKS', 'FFT', 'SKW', 'RPA',
  'ANZ', 'QFA', 'VOZ', 'JST', 'LAN', 'AVA', 'GLO', 'TAM', 'AEA', 'ARG',
  'ETH', 'KQA', 'SAA', 'RAM', 'MSR', 'NIG', 'RWD', 'SUD',
]);
function isMilCallsign(cs) {
  if (!cs) return false;
  const u = cs.toUpperCase().trim();
  for (const p of MILITARY_PREFIXES) { if (u.startsWith(p)) return true; }
  if (/^[A-Z]{4,}\d{1,3}$/.test(u)) return true;
  if (/^[A-Z]{3}\d{1,2}$/.test(u)) {
    if (!AIRLINE_CODES_SET.has(u.slice(0, 3))) return true;
  }
  return false;
}
function detectType(cs) {
  if (!cs) return 'unknown';
  const u = cs.toUpperCase().trim();
  if (/^(SHELL|TEXACO|ARCO|ESSO|PETRO|KC|STRAT)/.test(u)) return 'tanker';
  if (/^(SENTRY|AWACS|MAGIC|DISCO|DARKSTAR|E3|E8|E6)/.test(u)) return 'awacs';
  if (/^(RCH|REACH|MOOSE|EVAC|DUSTOFF|C17|C5|C130|C40)/.test(u)) return 'transport';
  if (/^(HOMER|OLIVE|JAKE|PSEUDO|GORDO|RC|U2|SR)/.test(u)) return 'reconnaissance';
  if (/^(RQ|MQ|REAPER|PREDATOR|GLOBAL)/.test(u)) return 'drone';
  if (/^(DEATH|BONE|DOOM|B52|B1|B2)/.test(u)) return 'bomber';
  return 'unknown';
}
const POSTURE_THEATERS = [
  { id: 'iran-theater', name: 'Iran Theater', bounds: { north: 42, south: 20, east: 65, west: 30 }, thresholds: { elevated: 8, critical: 20 }, strikeIndicators: { minTankers: 2, minAwacs: 1, minFighters: 5 } },
  { id: 'taiwan-theater', name: 'Taiwan Strait', bounds: { north: 30, south: 18, east: 130, west: 115 }, thresholds: { elevated: 6, critical: 15 }, strikeIndicators: { minTankers: 1, minAwacs: 1, minFighters: 4 } },
  { id: 'baltic-theater', name: 'Baltic Theater', bounds: { north: 65, south: 52, east: 32, west: 10 }, thresholds: { elevated: 5, critical: 12 }, strikeIndicators: { minTankers: 1, minAwacs: 1, minFighters: 3 } },
  { id: 'blacksea-theater', name: 'Black Sea', bounds: { north: 48, south: 40, east: 42, west: 26 }, thresholds: { elevated: 4, critical: 10 }, strikeIndicators: { minTankers: 1, minAwacs: 1, minFighters: 3 } },
  { id: 'korea-theater', name: 'Korean Peninsula', bounds: { north: 43, south: 33, east: 132, west: 124 }, thresholds: { elevated: 5, critical: 12 }, strikeIndicators: { minTankers: 1, minAwacs: 1, minFighters: 3 } },
  { id: 'south-china-sea', name: 'South China Sea', bounds: { north: 25, south: 5, east: 121, west: 105 }, thresholds: { elevated: 6, critical: 15 }, strikeIndicators: { minTankers: 1, minAwacs: 1, minFighters: 4 } },
  { id: 'east-med-theater', name: 'Eastern Mediterranean', bounds: { north: 37, south: 33, east: 37, west: 25 }, thresholds: { elevated: 4, critical: 10 }, strikeIndicators: { minTankers: 1, minAwacs: 1, minFighters: 3 } },
  { id: 'israel-gaza-theater', name: 'Israel/Gaza', bounds: { north: 33, south: 29, east: 36, west: 33 }, thresholds: { elevated: 3, critical: 8 }, strikeIndicators: { minTankers: 1, minAwacs: 1, minFighters: 3 } },
  { id: 'yemen-redsea-theater', name: 'Yemen/Red Sea', bounds: { north: 22, south: 11, east: 54, west: 32 }, thresholds: { elevated: 4, critical: 10 }, strikeIndicators: { minTankers: 1, minAwacs: 1, minFighters: 3 } },
];

app.post('/api/military/v1/get-theater-posture', async (c) => {
  try {
    const cached = apiCache.get('theater-posture');
    if (cached && Date.now() - cached.ts < 5 * 60 * 1000) return c.json(cached.data);

    // Fetch global OpenSky data
    const relayUrl = process.env.WS_RELAY_URL;
    let states = [];
    try {
      const url = relayUrl
        ? relayUrl.replace('wss://', 'https://').replace('ws://', 'http://') + '/opensky'
        : 'https://opensky-network.org/api/states/all';
      const headers = {};
      const secret = process.env.RELAY_SHARED_SECRET;
      if (relayUrl && secret) {
        headers[process.env.RELAY_AUTH_HEADER || 'x-relay-key'] = secret;
        headers['Authorization'] = `Bearer ${secret}`;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        states = data.states || [];
      }
    } catch { /* OpenSky unavailable */ }

    // Filter military flights
    const milFlights = [];
    for (const s of states) {
      const [icao24, callsign, , , , lon, lat, altitude, onGround, velocity, heading] = s;
      if (lat == null || lon == null || onGround) continue;
      const cs = (callsign || '').trim();
      if (!isMilCallsign(cs)) continue;
      milFlights.push({ id: icao24, callsign: cs, lat, lon, altitude: altitude || 0, heading: heading || 0, speed: velocity || 0, aircraftType: detectType(cs) });
    }

    // Calculate posture per theater
    const theaters = POSTURE_THEATERS.map(theater => {
      const tFlights = milFlights.filter(f =>
        f.lat >= theater.bounds.south && f.lat <= theater.bounds.north &&
        f.lon >= theater.bounds.west && f.lon <= theater.bounds.east
      );
      const total = tFlights.length;
      const tankers = tFlights.filter(f => f.aircraftType === 'tanker').length;
      const awacs = tFlights.filter(f => f.aircraftType === 'awacs').length;
      const fighters = tFlights.filter(f => f.aircraftType === 'fighter').length;
      const postureLevel = total >= theater.thresholds.critical ? 'critical'
        : total >= theater.thresholds.elevated ? 'elevated' : 'normal';
      const strikeCapable = tankers >= theater.strikeIndicators.minTankers &&
        awacs >= theater.strikeIndicators.minAwacs && fighters >= theater.strikeIndicators.minFighters;
      const ops = [];
      if (strikeCapable) ops.push('strike_capable');
      if (tankers > 0) ops.push('aerial_refueling');
      if (awacs > 0) ops.push('airborne_early_warning');
      return { theater: theater.id, postureLevel, activeFlights: total, trackedVessels: 0, activeOperations: ops, assessedAt: Date.now() };
    });

    const result = { theaters };
    apiCache.set('theater-posture', { data: result, ts: Date.now() });
    return c.json(result);
  } catch (err) {
    return c.json({ theaters: [] });
  }
});

// ── Intelligence — Country Intel Brief (OpenRouter, Italian) ─────────────────
const TIER1_COUNTRIES = {
  US: 'Stati Uniti', RU: 'Russia', CN: 'Cina', UA: 'Ucraina', IR: 'Iran',
  IL: 'Israele', TW: 'Taiwan', KP: 'Corea del Nord', SA: 'Arabia Saudita', TR: 'Turchia',
  PL: 'Polonia', DE: 'Germania', FR: 'Francia', GB: 'Regno Unito', IN: 'India',
  PK: 'Pakistan', SY: 'Siria', YE: 'Yemen', MM: 'Myanmar', VE: 'Venezuela',
  IT: 'Italia', JP: 'Giappone', KR: 'Corea del Sud', BR: 'Brasile', MX: 'Messico',
  AU: 'Australia', EG: 'Egitto', NG: 'Nigeria', ZA: 'Sudafrica', AR: 'Argentina',
};

app.post('/api/intelligence/v1/get-country-intel-brief', async (c) => {
  try {
    const body = await c.req.json();
    const countryCode = (body.countryCode || '').toUpperCase().trim();
    if (!countryCode || !/^[A-Z]{2}$/.test(countryCode)) {
      return c.json({ countryCode: '', countryName: '', brief: '', model: '', generatedAt: Date.now() });
    }

    const cacheKey = `intel-brief-${countryCode}`;
    const cached = apiCache.get(cacheKey);
    if (cached && Date.now() - cached.ts < 2 * 60 * 60 * 1000) return c.json(cached.data);

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
      return c.json({ countryCode, countryName: TIER1_COUNTRIES[countryCode] || countryCode, brief: '', model: '', generatedAt: Date.now() });
    }

    const countryName = TIER1_COUNTRIES[countryCode] || countryCode;
    const dateStr = new Date().toISOString().split('T')[0];

    const systemPrompt = `Sei un analista senior di intelligence che fornisce briefing completi sulla situazione dei paesi. Data corrente: ${dateStr}. Fornisci il contesto geopolitico appropriato per la data corrente.

Scrivi un briefing di intelligence conciso per il paese richiesto coprendo:
1. Situazione attuale - cosa sta succedendo ora
2. Postura militare e sicurezza
3. Fattori di rischio chiave
4. Contesto regionale
5. Prospettive e punti di attenzione

Regole:
- Sii specifico e analitico
- 4-5 paragrafi, 250-350 parole
- Nessuna speculazione oltre ciò che i dati supportano
- Usa un linguaggio chiaro, non gergale
- IMPORTANTE: Scrivi SEMPRE in italiano`;

    const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://fodi-eyes.fodivps2.cloud',
      },
      body: JSON.stringify({
        model: 'openrouter/free',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Paese: ${countryName} (${countryCode})` },
        ],
        temperature: 0.4,
        max_tokens: 900,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!resp.ok) {
      return c.json({ countryCode, countryName, brief: '', model: '', generatedAt: Date.now() });
    }

    const data = await resp.json();
    const brief = data.choices?.[0]?.message?.content?.trim() || '';
    const model = data.model || 'meta-llama/llama-3.1-8b-instant';

    const result = { countryCode, countryName, brief, model, generatedAt: Date.now() };
    if (brief) apiCache.set(cacheKey, { data: result, ts: Date.now() });
    return c.json(result);
  } catch (err) {
    return c.json({ countryCode: '', countryName: '', brief: '', model: '', generatedAt: Date.now() });
  }
});

// === WEBCAM DYNAMIC API (Open Data Hub + Windy Webcams) ===
const WINDY_API_KEY = process.env.WINDY_WEBCAMS_API_KEY || 'lBdSn2GcgSAG1pWrPv4qe3gW6EvlUpB4';

app.get('/api/webcams/dynamic', async (c) => {
  const region = c.req.query('region')?.toLowerCase();

  try {
    // Fetch both sources in parallel
    const [odhData, windyData] = await Promise.all([
      // Open Data Hub (Alto Adige)
      cachedFetch('odh-webcams', 30 * 60 * 1000, async () => {
        const res = await fetch(
          'https://tourism.opendatahub.com/v1/WebcamInfo?pagesize=500&active=true&origin=null&fields=Id,Webcamname,GpsInfo,Webcamurl,ImageGallery',
          {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(15000),
          }
        );
        if (!res.ok) throw new Error(`ODH: ${res.status}`);
        return res.json();
      }).catch(() => null),

      // Windy Webcams API v3 — disabled: API doesn't support country/bbox filter
      // and global pagination is too inefficient. Key saved for future use.
      // WINDY_API_KEY stored but not currently used.
      Promise.resolve(null),
    ]);

    let webcams = [];

    // Process Open Data Hub
    if (odhData) {
      const items = (odhData?.Items || odhData || []);
      // Webcamname is an object with language keys: {de: "...", it: "...", en: "..."}
      const getName = (nameObj) => {
        if (typeof nameObj === 'string') return nameObj;
        if (nameObj && typeof nameObj === 'object') {
          return nameObj.it || nameObj.de || nameObj.en || Object.values(nameObj)[0] || 'Sconosciuto';
        }
        return 'Sconosciuto';
      };

      const odhWebcams = items
        .filter(item => {
          const gps = item.GpsInfo?.[0];
          return gps?.Latitude && gps?.Longitude;
        })
        .map(item => {
          const gps = item.GpsInfo[0];
          const lat = gps.Latitude;
          const lon = gps.Longitude;
          let url = item.Webcamurl || '';
          const gallery = item.ImageGallery;
          if (Array.isArray(gallery) && gallery.length > 0) {
            url = gallery[0].ImageUrl || gallery[0].Url || url;
          }
          const name = getName(item.Webcamname);
          let regione = 'Trentino Alto Adige';
          if (lat < 46.0) regione = 'Veneto';
          if (lat < 45.5 && lon < 11) regione = 'Lombardia';
          return {
            id: `odh-${item.Id}`,
            comune: name.split(' - ')[0] || name,
            localita: name,
            provincia: '',
            regione,
            lat,
            lon,
            tipo: 'meteo',
            portale: 'opendatahub.com',
            url,
            attiva: true,
            source: 'api',
          };
        });
      webcams.push(...odhWebcams);
    }

    // Process Windy Webcams (API v3 format)
    if (windyData?.webcams) {
      const regionByCoords = (lat, lon) => {
        // Italian region mapping by lat/lon bounding boxes
        if (lat > 46.3 && lon > 10.3 && lon < 12.5) return 'Trentino Alto Adige';
        if (lat > 45.6 && lon > 13.0) return 'Friuli Venezia Giulia';
        if (lat > 45.5 && lon > 11 && lon < 13.1) return 'Veneto';
        if (lat > 45.0 && lon < 9.5) return 'Piemonte';
        if (lat > 45.4 && lon > 6.6 && lon < 7.9) return 'Valle d\'Aosta';
        if (lat > 44.5 && lon > 8.0 && lon < 10.1) return 'Liguria';
        if (lat > 44.7 && lon < 11.5 && lon > 9.0) return 'Lombardia';
        if (lat > 43.7 && lon > 10.3 && lon < 12.8) return 'Emilia Romagna';
        if (lat > 42.5 && lon > 9.5 && lon < 12.0) return 'Toscana';
        if (lat > 42.0 && lon > 12.0 && lon < 13.2) return 'Umbria';
        if (lat > 42.5 && lon > 13.0 && lon < 14.0) return 'Marche';
        if (lat > 41.2 && lon > 11.5 && lon < 14.0) return 'Lazio';
        if (lat > 41.6 && lon > 13.5 && lon < 15.0) return 'Abruzzo';
        if (lat > 41.4 && lon > 14.0 && lon < 15.2) return 'Molise';
        if (lat > 40.5 && lon > 13.5 && lon < 16.0) return 'Campania';
        if (lat > 39.8 && lon > 15.0 && lon < 18.6) return 'Puglia';
        if (lat > 39.9 && lon > 15.3 && lon < 17.2) return 'Basilicata';
        if (lat > 37.9 && lon > 15.5 && lon < 17.2) return 'Calabria';
        if (lat < 38.5 && lon > 12.0 && lon < 15.7) return 'Sicilia';
        if (lat < 41.3 && lon < 10.0 && lon > 8.0) return 'Sardegna';
        return 'Italia';
      };

      const windyWebcams = windyData.webcams
        .filter(cam => {
          // Only keep cams actually in Italy (nearby search has radius)
          const loc = cam.location || {};
          const cc = loc.country_code || loc.country || '';
          return cc === 'IT' || cc === 'Italy';
        })
        .map(cam => {
          const loc = cam.location || {};
          const img = cam.images?.current?.preview || cam.images?.current?.thumbnail || '';
          return {
            id: `windy-${cam.webcamId}`,
            comune: loc.city || 'Sconosciuto',
            localita: cam.title || loc.city || '',
            provincia: '',
            regione: regionByCoords(loc.latitude, loc.longitude),
            lat: loc.latitude,
            lon: loc.longitude,
            tipo: 'panoramica',
            portale: 'windy.com',
            url: img || `https://www.windy.com/webcams/${cam.webcamId}`,
            attiva: true,
            source: 'api',
          };
        });
      webcams.push(...windyWebcams);
    }

    // Filter by region if specified
    if (region) {
      webcams = webcams.filter(w => w.regione.toLowerCase().includes(region));
    }

    return c.json(webcams);
  } catch (err) {
    console.error('[webcams/dynamic] Error:', err.message);
    return c.json([]);
  }
});

// === TRAFFIC SNAPSHOT PROXY (bypass CORS for highway webcam images) ===
const TRAFFIC_SNAPSHOT_DOMAINS = new Set([
  'www.autobrennero.it', 'autobrennero.it',
  'www.autostrade.it', 'autostrade.it',
  'www.cfrv.it', 'cfrv.it',
  'www.strfriv.it', 'strfriv.it',
  'www.infoviaggiando.it', 'infoviaggiando.it',
]);

app.get('/api/traffic-snapshot', async (c) => {
  const url = c.req.query('url');
  if (!url) return c.text('Missing url parameter', 400);

  let parsedUrl;
  try { parsedUrl = new URL(url); } catch { return c.text('Invalid URL', 400); }

  if (!TRAFFIC_SNAPSHOT_DOMAINS.has(parsedUrl.hostname)) {
    return c.text(`Domain not allowed: ${parsedUrl.hostname}`, 403);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
        'Referer': parsedUrl.origin + '/',
      },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return c.text(`Upstream error: ${response.status}`, 502);
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const body = await response.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=30',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    const isTimeout = error.name === 'AbortError';
    return c.text(isTimeout ? 'Timeout fetching snapshot' : `Error: ${error.message}`, 502);
  }
});

// Catch-all for unknown API routes - return empty JSON instead of 404 HTML
app.all('/api/*', (c) => c.json({ error: 'Not found' }, 404));

// Serve static files from dist/
app.use('/*', serveStatic({ root: './dist' }));

// SPA fallback - serve index.html for all unmatched routes
app.get('*', serveStatic({ root: './dist', path: '/index.html' }));

const port = parseInt(process.env.PORT || '3000');
console.log(`Fodi-eyes server running on port ${port}`);
serve({ fetch: app.fetch, port });
