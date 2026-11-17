export const championships = Object.freeze([
  { id: 'a1-maschile-2026-27', name: 'Serie A1 maschile', season: '2026/27' },
  { id: 'a1-femminile-2026-27', name: 'Serie A1 femminile', season: '2026/27' },
]);

export async function getChampionship(id, view = 'squadre', round = 1, team = '') {
  const championship = championships.find(item => item.id === id);
  if (!championship) throw new Error('Campionato non riconosciuto');
  if (id !== 'a1-maschile-2026-27') return { ...championship, status: 'pending' };
  const response = await fetch(`/api/fin/${id}?${new URLSearchParams({ view, round, team })}`, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error('FIN non disponibile');
  const data = await response.json();
  if (data.status !== 'available' || data.season !== championship.season) throw new Error('Dati FIN non validi');
  return { ...championship, ...data };
}
