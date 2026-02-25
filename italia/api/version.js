export const config = { runtime: 'edge' };

export default async function handler() {
  return new Response(JSON.stringify({ version: '3.0.0', name: 'FODI Eyes' }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
