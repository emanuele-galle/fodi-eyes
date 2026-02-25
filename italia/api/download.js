export const config = { runtime: 'edge' };

export default async function handler() {
  return new Response(JSON.stringify({ error: 'Not available' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}
