/**
 * Mondo server — serves SPA static files + RPC gateway API.
 *
 * Replaces the nginx-only approach with a Node.js server that can
 * handle the 17 sebuf service domains (46 RPC endpoints).
 */

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST_DIR = join(__dirname, '..', 'dist');
const PORT = parseInt(process.env.PORT || '3000', 10);

// Import the compiled RPC gateway
let rpcHandler;
try {
  const gateway = await import('./rpc-gateway.mjs');
  rpcHandler = gateway.default;
  console.log('[mondo] RPC gateway loaded successfully');
} catch (err) {
  console.error('[mondo] Failed to load RPC gateway:', err.message);
  rpcHandler = null;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
};

// Cache control for hashed assets
const IMMUTABLE_EXTENSIONS = new Set(['.js', '.mjs', '.css', '.woff2', '.woff', '.ttf', '.wasm']);

/**
 * Convert Node.js IncomingMessage to Web Request for the RPC gateway
 */
function nodeToWebRequest(req) {
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  const host = req.headers['host'] || `localhost:${PORT}`;
  const url = new URL(req.url, `${protocol}://${host}`);

  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value) headers.set(key, Array.isArray(value) ? value.join(', ') : value);
  }

  const init = {
    method: req.method,
    headers,
  };

  // POST/PUT/PATCH get a body
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    init.body = req;
    init.duplex = 'half';
  }

  return new Request(url.toString(), init);
}

/**
 * Send Web Response back through Node.js ServerResponse
 */
async function sendWebResponse(webRes, res) {
  res.writeHead(webRes.status, Object.fromEntries(webRes.headers.entries()));
  if (webRes.body) {
    const reader = webRes.body.getReader();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  res.end();
}

/**
 * Try to serve a static file from dist/
 */
async function serveStatic(pathname, res) {
  // Security: prevent directory traversal
  const safePath = pathname.replace(/\.\./g, '');
  const filePath = join(DIST_DIR, safePath);

  // Make sure we stay within DIST_DIR
  if (!filePath.startsWith(DIST_DIR)) {
    return false;
  }

  try {
    const fileStat = await stat(filePath);
    if (!fileStat.isFile()) return false;

    const ext = extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    const content = await readFile(filePath);

    const headers = {
      'Content-Type': contentType,
      'Content-Length': content.length,
      'X-Content-Type-Options': 'nosniff',
    };

    // Aggressive caching for hashed assets
    if (IMMUTABLE_EXTENSIONS.has(ext) && safePath.match(/\.[a-f0-9]{8,}\./)) {
      headers['Cache-Control'] = 'public, max-age=31536000, immutable';
    }

    res.writeHead(200, headers);
    res.end(content);
    return true;
  } catch {
    return false;
  }
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    // RPC API routes: /api/{domain}/v1/{rpc}
    if (pathname.startsWith('/api/') && rpcHandler) {
      const webReq = nodeToWebRequest(req);
      const webRes = await rpcHandler(webReq);
      await sendWebResponse(webRes, res);
      return;
    }

    // Static files under /mondo/ — strip prefix to map to dist/
    if (pathname === '/mondo/' || pathname.startsWith('/mondo/')) {
      // Strip /mondo prefix: /mondo/assets/main.js → /assets/main.js
      const stripped = pathname === '/mondo/' ? '/index.html' : pathname.slice('/mondo'.length);
      const served = await serveStatic(stripped, res);
      if (served) return;

      // SPA fallback — serve index.html for non-file routes
      const indexPath = join(DIST_DIR, 'index.html');
      try {
        const content = await readFile(indexPath, 'utf-8');
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
        return;
      } catch {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
        return;
      }
    }

    // Redirect root to /mondo/
    if (pathname === '/' || pathname === '') {
      res.writeHead(301, { 'Location': '/mondo/' });
      res.end();
      return;
    }

    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (err) {
    console.error('[mondo] Request error:', err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`[mondo] Server listening on port ${PORT}`);
  console.log(`[mondo] RPC gateway: ${rpcHandler ? 'active' : 'disabled'}`);
});
