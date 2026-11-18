import { loadOfficial, loadTeam, sourceUrl } from './fin.mjs';

export const config = { path: '/api/*' };
export default async function handler(request) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/fin/a1-maschile-2026-27') return new Response('Not found', { status: 404 });
  if (request.method !== 'GET') return new Response('Method not allowed', { status: 405, headers: { Allow: 'GET' } });
  const view = url.searchParams.get('view') || 'squadre';
  const roundText = url.searchParams.get('round') || '1';
  if (!['squadre', 'calendario', 'risultati', 'classifica', 'scheda'].includes(view) || !/^\d{1,2}$/.test(roundText)) return Response.json({ status: 'error' }, { status: 400 });
  const teamId = url.searchParams.get('team');
  if (view === 'scheda' && (!teamId || !/^[0-9;_-]{1,100}$/.test(teamId))) return Response.json({ status: 'error' }, { status: 400 });
  try {
    const data = view === 'scheda'
      ? await loadTeam({ teamId, round: Number(roundText) })
      : await loadOfficial({ view, round: Number(roundText) });
    return Response.json(data, { headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Netlify-CDN-Cache-Control': 'public, s-maxage=300',
      'X-Content-Type-Options': 'nosniff',
    } });
  } catch (error) {
    return Response.json({ status: 'error', sourceUrl, message: 'Collegamento FIN non verificabile al momento. Nessun dato sostitutivo viene mostrato.' }, { status: error instanceof RangeError ? 400 : 502, headers: { 'Cache-Control': 'no-store' } });
  }
}
