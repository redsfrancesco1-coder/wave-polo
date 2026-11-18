import { load } from 'cheerio';

export const sourceUrl = 'https://www.federnuoto.it/home/pallanuoto/campionato-a1-maschile/2026-2027-pn-m/regular-season-pn-m-2026-2027.html';
const clean = element => element.text().replace(/\s+/g, ' ').trim();
const integer = value => {
  if (!/^-?\d+$/.test(value)) throw new Error('Numero FIN non valido');
  return Number(value);
};
const required = value => {
  if (!value) throw new Error('Campo FIN mancante');
  return value;
};

export function parsePage(html) {
  const $ = load(html);
  if (!/^Regular Season Campionato A1 maschile 2026-2027$/.test(clean($('title')))) throw new Error('Stagione o competizione FIN non corrispondente');
  const root = $('[data-com="com_solrconnect"][data-section="pallanuoto"]');
  const params = {};
  for (const key of ['itemid', 'solr[id_evento]', 'solr[id_fase]', 'solr[id_girone]']) {
    params[key] = required(root.find('input').filter((_, e) => $(e).attr('name') === key).attr('value'));
    integer(params[key]);
  }
  const rounds = root.find('.giornate [data-id]').toArray().map(e => {
    const [day, turn, number] = $(e).attr('data-id').split(';');
    return { day: integer(day), turn: integer(turn), number: integer(number) };
  });
  if (!rounds.length || new Set(rounds.map(r => r.number)).size !== rounds.length) throw new Error('Giornate FIN non valide');
  return { params, rounds };
}

export function parseStandings(html) {
  const $ = load(html);
  const expected = ['Squadra', 'Punti', 'Penalità', 'G', 'V', 'N', 'P', 'GF', 'GS', 'DR'];
  const headers = $('thead th').toArray().map(e => clean($(e)));
  if (JSON.stringify(headers) !== JSON.stringify(expected)) throw new Error('Colonne classifica FIN cambiate');
  const standings = $('tbody tr').toArray().map(e => {
    const cells = $(e).find('td');
    if (cells.length !== 10) throw new Error('Riga classifica FIN non valida');
    const team = cells.eq(0).find('[data-view="squadra"]');
    const values = cells.slice(1).toArray().map(e => integer(clean($(e))));
    const [points, penalty, played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference] = values;
    return { teamId: required(team.attr('data-id')), name: required(clean(team)), points, penalty, played, won, drawn, lost, goalsFor, goalsAgainst, goalDifference };
  });
  if (!standings.length || new Set(standings.map(t => t.teamId)).size !== standings.length) throw new Error('Classifica FIN vuota o duplicata');
  return standings;
}

export function parseFixtures(html, round) {
  const $ = load(html);
  const fixtures = $('.sb_champ_table_container').toArray().map(e => {
    const row = $(e);
    const home = row.find('.table_team.first .team_name');
    const away = row.find('.table_team.last .team_name');
    const status = required(row.attr('data-status'));
    // FIN includes zero placeholders for games not played. Never publish them as scores.
    const played = status === 'disputata';
    return {
      id: required(row.attr('data-gara-id')), round,
      homeTeamId: required(home.attr('data-id')), awayTeamId: required(away.attr('data-id')),
      homeName: required(clean(home)), awayName: required(clean(away)),
      dateLabel: clean(row.find('.date_time')), status,
      homeScore: played ? integer(clean(row.find('.ris1'))) : null,
      awayScore: played ? integer(clean(row.find('.ris2'))) : null,
    };
  });
  if (!fixtures.length || new Set(fixtures.map(f => f.id)).size !== fixtures.length) throw new Error('Incontri FIN mancanti o duplicati');
  return fixtures;
}

export async function loadOfficial({ view = 'squadre', round = 1, fetcher = fetch } = {}) {
  const signal = AbortSignal.timeout(17000);
  const read = async (url, options = {}) => {
    const response = await fetcher(url, { ...options, headers: { 'User-Agent': 'WAVE-POLO/2.0 (public FIN results reader)', Accept: 'text/html,application/json' }, signal, redirect: 'error' });
    if (!response.ok) throw new Error('Fonte FIN non disponibile');
    return response;
  };
  const { params, rounds } = parsePage(await (await read(sourceUrl)).text());
  const selected = rounds.find(r => r.number === round);
  if (!selected) throw new RangeError('Giornata non disponibile');
  const resultsView = ['calendario', 'risultati'].includes(view);
  const remoteView = resultsView ? 'campionato' : 'classifica';
  const body = new URLSearchParams({ ...params, 'solr[giornata]': selected.day, 'solr[id_turno]': selected.turn, giornata: selected.number });
  const payload = await (await read(`https://www.federnuoto.it/index.php?option=com_solrconnect&currentpage=1&view=${remoteView}&format=json`, { method: 'POST', body })).json();
  const fragment = payload?.status === 'OK' && payload.items?.find(item => item.content_id === (resultsView ? 'giornata' : 'classifica'));
  if (!fragment || typeof fragment.content !== 'string') throw new Error('Risposta FIN non riconosciuta');
  const standings = resultsView ? [] : parseStandings(fragment.content);
  const fixtures = resultsView ? parseFixtures(fragment.content, round) : [];
  return {
    status: 'available', season: '2026/27', phase: 'Regular Season', sourceUrl,
    checkedAt: new Date().toISOString(), updatedAt: null,
    rounds: rounds.map(r => r.number), round,
    teams: standings.map(t => ({ id: t.teamId, name: t.name })), standings, fixtures,
    results: fixtures.filter(f => f.status === 'disputata'),
  };
}

// Team identity and statistics come exclusively from the verified season standings.
export async function loadTeam({ teamId, round = 1, fetcher = fetch } = {}) {
  const deadline = AbortSignal.timeout(17000);
  const boundedFetch = (url, options) => fetcher(url, { ...options, signal: AbortSignal.any([deadline, options.signal]) });
  const ranking = await loadOfficial({ view: 'classifica', round, fetcher: boundedFetch });
  const statistics = ranking.standings.find(team => team.teamId === teamId);
  if (!statistics) throw new RangeError('Squadra non disponibile');
  let games;
  try {
    games = await loadOfficial({ view: 'calendario', round, fetcher: boundedFetch });
  } catch {
    // A failed calendar must not hide verified identity and standings.
  }
  const fixtures = games?.fixtures.filter(game => game.homeTeamId === teamId || game.awayTeamId === teamId) ?? [];
  return {
    ...ranking, teams: undefined, standings: undefined,
    team: { id: teamId, name: statistics.name, logoUrl: null, roster: null },
    statistics, fixtures, results: fixtures.filter(game => game.status === 'disputata'),
    calendarStatus: games ? 'available' : 'unavailable', calendarCheckedAt: games?.checkedAt ?? null,
  };
}
