export const config = { runtime: 'edge' };

export default async function handler() {
  return new Response(JSON.stringify({ version: '3.0.0', name: 'FODI Eyes' }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
