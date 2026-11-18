import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTeam } from '../netlify/server/fin.mjs';
import handler from '../netlify/server/index.mjs';

// Protocol fixtures only: these are never served as sporting data.
const page = `<title>Regular Season Campionato A1 maschile 2026-2027</title><div data-com="com_solrconnect" data-section="pallanuoto"><input name="itemid" value="1"><input name="solr[id_evento]" value="2"><input name="solr[id_fase]" value="3"><input name="solr[id_girone]" value="4"><div class="giornate"><i data-id="1;1;1"></i></div></div>`;
const columns = ['Squadra', 'Punti', 'Penalità', 'G', 'V', 'N', 'P', 'GF', 'GS', 'DR'];
const ranking = `<table><thead><tr>${columns.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody><tr><td><a data-view="squadra" data-id="17">Test &amp; squadra</a></td>${Array(9).fill('<td>0</td>').join('')}</tr></tbody></table>`;
const fixture = (id, home, away, status) => `<div class="sb_champ_table_container" data-gara-id="${id}" data-status="${status}"><div class="table_team first"><span class="team_name" data-id="${home}">Test casa</span></div><div class="table_team last"><span class="team_name" data-id="${away}">Test ospiti</span></div><span class="ris1">0</span><span class="ris2">0</span><span class="date_time">Data di test</span></div>`;
function fetcher({ failCalendar = false } = {}) {
  return async url => {
    if (!url.includes('format=json')) return new Response(page);
    const calendar = url.includes('view=campionato');
    if (calendar && failCalendar) return new Response('', { status: 503 });
    return Response.json({ status: 'OK', items: [{ content_id: calendar ? 'giornata' : 'classifica', content: calendar ? fixture('1', '17', '18', 'prevista') + fixture('2', '19', '17', 'disputata') + fixture('3', '20', '21', 'disputata') : ranking }] });
  };
}

test('team profile filters both home and away matches, keeps unplayed scores null and uses FIN statistics', async () => {
  const data = await loadTeam({ teamId: '17', fetcher: fetcher() });
  assert.equal(data.team.name, 'Test & squadra');
  assert.equal(data.team.logoUrl, null);
  assert.equal(data.team.roster, null);
  assert.equal(data.statistics.points, 0);
  assert.equal(data.fixtures.length, 2);
  assert.equal(data.fixtures[0].homeScore, null);
  assert.deepEqual(data.results.map(g => g.id), ['2']);
  assert.equal(data.calendarStatus, 'available');
});

test('calendar outage retains verified identity and marks calendar unavailable', async () => {
  const data = await loadTeam({ teamId: '17', fetcher: fetcher({ failCalendar: true }) });
  assert.equal(data.team.id, '17');
  assert.equal(data.calendarStatus, 'unavailable');
  assert.equal(data.calendarCheckedAt, null);
  assert.deepEqual(data.fixtures, []);
});

test('unknown teams and rounds are rejected rather than producing a profile', async () => {
  await assert.rejects(loadTeam({ teamId: '99', fetcher: fetcher() }), RangeError);
  await assert.rejects(loadTeam({ teamId: '17', round: 2, fetcher: fetcher() }), RangeError);
});

test('team API rejects missing and malformed identifiers before contacting FIN', async () => {
  for (const team of ['', '&team=', '&team=https://other.test', '&team=%3Cscript%3E']) {
    const response = await handler(new Request(`https://wave.test/api/fin/a1-maschile-2026-27?view=scheda${team}`));
    assert.equal(response.status, 400);
  }
});

test('browser links preserve the originating table, decode FIN identifiers and escape team names', async () => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  const source = await readFile(new URL('../public/assets/app.js', import.meta.url), 'utf8');
  const location = { hash: '#campionati/a1-maschile-2026-27/classifica' };
  const browser = runInNewContext(source.replace(/^import .*\n/, '').split('async function render()')[0] + '\n({teamLink, route, teamPanel})', {
    championships: [{ id: 'a1-maschile-2026-27' }], location,
    document: { getElementById: () => ({}) },
  });
  const link = browser.teamLink('17;2', '<script>');
  assert.ok(link.includes('/scheda/17%3B2/classifica'));
  assert.ok(link.includes('&lt;script&gt;'));
  location.hash = '#campionati/a1-maschile-2026-27/scheda/17%3B2/classifica';
  assert.equal(browser.route().teamId, '17;2');
  assert.equal(browser.route().returnView, 'classifica');
  const data = await loadTeam({ teamId: '17', fetcher: fetcher() });
  const html = browser.teamPanel(data, browser.route());
  for (const section of ['team-roster', 'team-statistics', 'team-calendar', 'team-results']) assert.ok(html.includes(`id="${section}"`));
  assert.ok(html.includes('Test &amp; squadra'));
  assert.ok(html.includes('In attesa dei dati ufficiali'));
});
