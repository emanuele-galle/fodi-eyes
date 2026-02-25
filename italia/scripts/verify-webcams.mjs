/**
 * verify-webcams.mjs
 *
 * Verifica la raggiungibilità di tutte le webcam in webcams-italia.ts.
 * Esegui con: node scripts/verify-webcams.mjs
 *
 * Output JSON su stdout con il riepilogo e la lista delle webcam offline.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CONFIG_PATH = resolve(__dirname, '../src/config/webcams-italia.ts');
const TIMEOUT_MS = 10_000;
const CONCURRENCY = 10; // richieste parallele simultanee

// ---------------------------------------------------------------------------
// Parsing del file TypeScript con regex
// ---------------------------------------------------------------------------

function parseWebcams(tsSource) {
  const webcams = [];

  // Estrae ogni oggetto webcam cercando blocchi { id: '...', ... }
  // Usiamo una regex che trova i blocchi delimitati da { ... } dentro l'array
  const objectRegex = /\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g;

  let match;
  while ((match = objectRegex.exec(tsSource)) !== null) {
    const block = match[1];

    // Verifica che il blocco contenga i campi obbligatori di TerritorialWebcam
    if (!block.includes("id:") || !block.includes("url:") || !block.includes("portale:")) {
      continue;
    }

    const extract = (field) => {
      const re = new RegExp(`${field}:\\s*['"\`]([^'"\`]+)['"\`]`);
      const m = block.match(re);
      return m ? m[1] : null;
    };

    const extractBool = (field) => {
      const re = new RegExp(`${field}:\\s*(true|false)`);
      const m = block.match(re);
      return m ? m[1] === 'true' : null;
    };

    const id = extract('id');
    const url = extract('url');
    const portale = extract('portale');
    const comune = extract('comune');
    const localita = extract('localita');
    const attiva = extractBool('attiva');

    if (!id || !url) continue;

    webcams.push({ id, url, portale, comune, localita, attiva });
  }

  return webcams;
}

// ---------------------------------------------------------------------------
// Test di raggiungibilità
// ---------------------------------------------------------------------------

async function checkUrl(webcam) {
  const { id, url, portale, comune, localita } = webcam;

  // SkylineWebcams blocca HEAD → usiamo GET con abort precoce
  const isSkyline = portale && portale.includes('skylinewebcams.com');
  const method = isSkyline ? 'GET' : 'HEAD';

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; FodiEyes-Checker/1.0)',
      },
    });

    clearTimeout(timer);

    const online = res.ok; // 200-299
    return {
      id,
      url,
      comune,
      localita,
      portale,
      status: res.status,
      online,
      error: null,
    };
  } catch (err) {
    clearTimeout(timer);
    const isTimeout = err.name === 'AbortError';
    return {
      id,
      url,
      comune,
      localita,
      portale,
      status: null,
      online: false,
      error: isTimeout ? 'TIMEOUT' : err.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Esecuzione con concorrenza limitata
// ---------------------------------------------------------------------------

async function runWithConcurrency(tasks, limit) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.min(limit, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const tsSource = readFileSync(CONFIG_PATH, 'utf-8');
  const webcams = parseWebcams(tsSource);

  if (webcams.length === 0) {
    console.error('Nessuna webcam trovata nel file di configurazione.');
    process.exit(1);
  }

  process.stderr.write(`Trovate ${webcams.length} webcam. Inizio verifica con concorrenza ${CONCURRENCY}...\n`);

  let done = 0;
  const tasks = webcams.map((w) => async () => {
    const result = await checkUrl(w);
    done++;
    const icon = result.online ? '✓' : '✗';
    const statusStr = result.status ? `HTTP ${result.status}` : result.error;
    process.stderr.write(`[${done}/${webcams.length}] ${icon} ${w.id} — ${statusStr}\n`);
    return result;
  });

  const results = await runWithConcurrency(tasks, CONCURRENCY);

  const online = results.filter((r) => r.online);
  const offline = results.filter((r) => !r.online);

  const summary = {
    total: webcams.length,
    online: online.length,
    offline: offline.length,
    offlineWebcams: offline.map((r) => ({
      id: r.id,
      comune: r.comune,
      localita: r.localita,
      url: r.url,
      portale: r.portale,
      status: r.status,
      error: r.error,
    })),
  };

  // Output JSON su stdout
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error('Errore fatale:', err);
  process.exit(1);
});
