import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { startScan, getScan, getModules, exportScan, abortScan } from './scanner.js';
import type { ScanRequest } from './types.js';

const app = new Hono();

app.use('/*', cors({ origin: '*' }));

// ── API ROUTES ─────────────────────────────────────────────────────────────

// List available modules
app.get('/api/osint/modules', (c) => {
  return c.json({ modules: getModules() });
});

// Start a scan
app.post('/api/osint/scan', async (c) => {
  try {
    const body = await c.req.json<ScanRequest>();

    if (!body.target || typeof body.target !== 'string') {
      return c.json({ error: 'Missing or invalid target' }, 400);
    }

    const target = body.target.trim();
    if (target.length < 2 || target.length > 255) {
      return c.json({ error: 'Target must be 2-255 characters' }, 400);
    }

    const modules = Array.isArray(body.modules) ? body.modules : [];
    const id = await startScan(target, modules, body.type);

    return c.json({ id, status: 'running' });
  } catch (err) {
    return c.json({ error: 'Invalid request body' }, 400);
  }
});

// Get scan results (polling)
app.get('/api/osint/scan/:id', (c) => {
  const id = c.req.param('id');
  const scan = getScan(id);

  if (!scan) {
    return c.json({ error: 'Scan not found' }, 404);
  }

  return c.json(scan);
});

// Export scan results
app.get('/api/osint/export/:id', (c) => {
  const id = c.req.param('id');
  const formatParam = c.req.query('format') || 'json';
  if (formatParam !== 'json' && formatParam !== 'csv') {
    return c.json({ error: 'Invalid format. Use "json" or "csv"' }, 400);
  }
  const format = formatParam as 'json' | 'csv';

  const data = exportScan(id, format);
  if (!data) {
    return c.json({ error: 'Scan not found' }, 404);
  }

  const contentType = format === 'csv' ? 'text/csv' : 'application/json';
  const filename = `osint-scan-${id}.${format}`;

  return new Response(data, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
});

// Abort a running scan
app.delete('/api/osint/scan/:id', (c) => {
  const id = c.req.param('id');
  const scan = getScan(id);
  if (!scan) {
    return c.json({ error: 'Scan not found' }, 404);
  }
  abortScan(id);
  return c.json({ id, status: 'aborted' });
});

// Health check
app.get('/api/osint/health', (c) => c.json({ status: 'ok', service: 'osint-scanner' }));

// ── STATIC FRONTEND ────────────────────────────────────────────────────────
// Serve static assets from the frontend/ directory
app.use('/*', serveStatic({ root: './frontend' }));

// SPA fallback — serve index.html for any unmatched GET
app.get('/*', serveStatic({ path: './frontend/index.html' }));

// ── START ──────────────────────────────────────────────────────────────────
const port = parseInt(process.env.PORT || '3003');
console.log(`OSINT Scanner running on port ${port}`);
serve({ fetch: app.fetch, port });
