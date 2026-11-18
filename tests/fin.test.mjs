import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parsePage, parseFixtures, parseStandings, loadOfficial, sourceUrl } from '../netlify/server/fin.mjs';
import handler from '../netlify/server/index.mjs';

// Opt-in integration check: all sporting input is fetched from FIN, never fabricated.
test('live FIN: season, standings, rounds, completed games and schema drift', { skip: !process.env.FIN_LIVE_TEST }, async () => {
  const captured = [];
  const fetcher = async (...args) => {
    const response = await fetch(...args);
    captured.push(await response.clone().text());
    return response;
  };
  const ranking = await loadOfficial({ view: 'classifica', fetcher });
  assert.equal(ranking.season, '2026/27');
  assert.ok(ranking.teams.length > 0);
  assert.equal(ranking.teams.length, ranking.standings.length);
  const page = captured[0];
  const rankHtml = JSON.parse(captured[1]).items.find(x => x.content_id === 'classifica').content;
  assert.throws(() => parsePage(page.replaceAll('2026-2027', '2025-2026')));
  assert.throws(() => parseStandings(rankHtml.replace('Penalit&agrave;', 'Changed')));
  assert.throws(() => parseStandings('<table></table>'));
  const games = await loadOfficial({ view: 'risultati', fetcher });
  assert.ok(games.fixtures.length > 0);
  assert.ok(games.results.every(g => g.status === 'disputata' && Number.isInteger(g.homeScore) && Number.isInteger(g.awayScore)));
  assert.ok(games.fixtures.filter(g => g.status !== 'disputata').every(g => g.homeScore === null && g.awayScore === null));
  const gamesHtml = JSON.parse(captured[3]).items.find(x => x.content_id === 'giornata').content;
  assert.throws(() => parseFixtures(gamesHtml.replaceAll('data-gara-id=', 'removed-id='), 1));
  assert.throws(() => parseFixtures('', 1));
  assert.equal(ranking.sourceUrl, sourceUrl);
  console.log(`FIN verified: ${ranking.teams.length} teams, ${ranking.rounds.length} rounds, round 1: ${games.fixtures.length} fixtures / ${games.results.length} completed`);
});

test('API rejects unsupported routes, methods and parameters before contacting FIN', async () => {
  assert.equal((await handler(new Request('https://wave.test/api/other'))).status, 404);
  assert.equal((await handler(new Request('https://wave.test/api/fin/a1-maschile-2026-27', { method: 'POST' }))).status, 405);
  for (const query of ['view=other', 'round=NaN', 'round=100', 'round=-1']) {
    assert.equal((await handler(new Request(`https://wave.test/api/fin/a1-maschile-2026-27?${query}`))).status, 400);
  }
});

test('browser integration uses official endpoint and has no Google Sheets dependency', async () => {
  const data = await readFile(new URL('../public/data/championships.js', import.meta.url), 'utf8');
  assert.ok(data.includes('/api/fin/'));
  assert.ok(!data.includes('sheets.js'));
});
