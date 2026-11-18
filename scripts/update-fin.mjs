import { mkdir, writeFile } from 'node:fs/promises';
import { loadOfficial } from '../netlify/server/fin.mjs';
// One ranking and one round per run. Failed checks never overwrite the last verified snapshot.
const round = Number(process.env.WAVE_ROUND || '7');
if (!Number.isInteger(round) || round < 1 || round > 30) throw new Error('Invalid round');
const ranking = await loadOfficial({ view: 'classifica', round });
const games = await loadOfficial({ view: 'calendario', round });
if (ranking.status !== 'available' || games.status !== 'available') throw new Error('Unverified source');
const snapshot = { ...ranking, round, fixtures: games.fixtures, results: games.results,
  rounds: [round], checkedAt: new Date().toISOString() };
await mkdir('public/data', { recursive: true });
await writeFile('public/data/fin-a1-maschile.json', JSON.stringify(snapshot, null, 2) + '\n');
console.log('Verified FIN snapshot generated:', snapshot.checkedAt, 'round', round);
