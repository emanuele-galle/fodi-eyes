/**
 * Compiles the sebuf RPC gateway (api/[domain]/v1/[rpc].ts) into a single
 * ESM bundle for the Node.js server runtime.
 *
 * Run: node scripts/build-server.mjs
 */

import { build } from 'esbuild';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

const entryPoint = path.join(projectRoot, 'api', '[domain]', 'v1', '[rpc].ts');
const outfile = path.join(projectRoot, 'server', 'rpc-gateway.mjs');

try {
  await build({
    entryPoints: [entryPoint],
    outfile,
    bundle: true,
    format: 'esm',
    platform: 'node',
    target: 'node18',
    treeShaking: true,
    // Do NOT define process.env.* — all env vars must remain runtime-accessible
  });

  const { size } = await stat(outfile);
  const sizeKB = (size / 1024).toFixed(1);
  console.log(`build-server  server/rpc-gateway.mjs  ${sizeKB} KB`);
} catch (err) {
  console.error('build-server failed:', err.message);
  process.exit(1);
}
