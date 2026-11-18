import { championships, getChampionship } from '../data/championships.js';

const sections = {
  campionati: 'Campionati', partite: 'Partite', classifiche: 'Classifiche',
  squadre: 'Squadre', giocatori: 'Giocatori', preferiti: 'Preferiti',
};
const views = { squadre: 'Squadre', calendario: 'Calendario', risultati: 'Risultati', classifica: 'Classifica' };
const descriptions = {
  squadre: 'Le squadre partecipanti compariranno dopo la pubblicazione e la verifica dei dati FIN.',
  calendario: 'Date, orari e incontri compariranno dopo la pubblicazione e la verifica del calendario FIN.',
  risultati: 'I punteggi compariranno dopo la pubblicazione e la verifica dei risultati FIN.',
  classifica: 'Posizioni e punti compariranno dopo la pubblicazione e la verifica della classifica FIN.',
};
const content = document.getElementById('content');
const clock = '<span class="empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></svg></span>';
let renderId = 0;
let selectedRound = 7;

function empty(description) {
  return `<div class="empty">${clock}<h3>In attesa dei dati ufficiali</h3><p class="muted">${description}</p></div>`;
}
function source() {
  return '<div class="source"><span>Questo campionato non è ancora collegato · Nessun aggiornamento disponibile</span><a href="https://www.federnuoto.it/" target="_blank" rel="noopener noreferrer">Fonte ufficiale: FIN ↗</a></div>';
}
function escapeText(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
function teamLink(id, name) {
  const section = route().section;
  const origin = section === 'classifiche' || route().view === 'classifica' ? 'classifica' : 'squadre';
  const logo = /pro[\s-]?recco/i.test(name) ? '<img src="assets/team-logos/pro-recco-waterpolo.png" alt="" width="24" height="24" style="vertical-align:middle;margin-right:8px;object-fit:contain">' : '';
  
  return `<a class="team-link" href="#${section}/a1-maschile-2026-27/scheda/${encodeURIComponent(id)}/${origin}">${escapeText(name)}</a>>${logo}${escapeText(name)}</a>`;
}
function teamPanel(data, state) {
  const e = escapeText;
  const stats = data.statistics;
  const labels = { points: 'Punti', penalty: 'Penalità', played: 'Giocate', won: 'Vinte', drawn: 'Pareggiate', lost: 'Perse', goalsFor: 'Gol fatti', goalsAgainst: 'Gol subiti', goalDifference: 'Differenza reti' };
  const games = list => list.length ? `<ul class="match-list">${list.map(g => `<li><div><strong>${e(g.homeName)}</strong><span>${e(g.awayName)}</span></div><div class="match-score"><strong>${g.status === 'disputata' ? `${g.homeScore} – ${g.awayScore}` : '—'}</strong><small>${e(g.status)}</small></div><p class="muted">${e(g.dateLabel || 'Data non disponibile')}</p></li>`).join('')}</ul>` : `<p class="muted">Nessun incontro pubblicato in questa giornata.</p>`;
  return `<a class="back-link" href="#${state.section}/${state.leagueId}/${state.returnView}">← Torna a ${state.returnView === 'classifica' ? 'classifica' : 'squadre'}</a>
    <div class="team-hero"><div class="team-logo-placeholder"><span>Logo</span><small>In attesa dei dati ufficiali</small></div><div><span class="eyebrow">SCHEDA SQUADRA · ${e(data.season)}</span><h2 tabindex="-1" id="team-name">${e(data.team.name)}</h2><p class="muted">Serie A1 maschile · Regular Season · Fonte FIN</p></div></div>
    <nav class="team-sections" aria-label="Sezioni della scheda"><a href="#team-roster" data-jump="team-roster">Rosa</a><a href="#team-statistics" data-jump="team-statistics">Statistiche</a><a href="#team-calendar" data-jump="team-calendar">Calendario</a><a href="#team-results" data-jump="team-results">Risultati</a></nav>
    <section class="team-section" id="team-roster"><h3>Rosa giocatori</h3>${empty('La rosa di questa squadra per il 2026/27 non è ancora disponibile da una fonte FIN verificata.')}</section>
    <section class="team-section" id="team-statistics"><h3>Statistiche</h3><p class="muted">Valori complessivi riportati dalla classifica FIN, senza ricalcoli. Non dipendono dalla giornata selezionata.</p><dl class="team-stats">${Object.entries(labels).map(([key, label]) => `<div><dt>${label}</dt><dd>${e(stats[key])}</dd></div>`).join('')}</dl></section>
    <section class="team-section" id="team-calendar"><h3>Calendario</h3><div class="round-picker"><label for="fin-round">Giornata</label><select id="fin-round">${data.rounds.map(r => `<option value="${r}" ${r === data.round ? 'selected' : ''}>${r}</option>`).join('')}</select></div><p class="muted">Incontri della squadra nella giornata selezionata. Date e orari come pubblicati dalla FIN.</p>${data.calendarStatus === 'available' ? games(data.fixtures) : '<p role="status" class="muted">Calendario FIN non verificabile al momento. Usa Aggiorna da FIN per riprovare.</p>'}</section>
    <section class="team-section" id="team-results"><h3>Risultati · Giornata ${data.round}</h3>${data.calendarStatus !== 'available' ? '<p class="muted">Risultati FIN non verificabili al momento.</p>' : data.results.length ? games(data.results) : '<p class="muted">Nessun incontro indicato come disputato dalla FIN per questa squadra nella giornata selezionata.</p>'}</section>
    <p class="muted">Logo e rosa: in attesa dei dati ufficiali. Lettura classifica FIN: ${e(new Date(data.checkedAt).toLocaleString('it-IT'))}.${data.calendarCheckedAt ? ` Lettura calendario FIN: ${e(new Date(data.calendarCheckedAt).toLocaleString('it-IT'))}.` : ''} Controllo automatico ogni 15 minuti, se la pubblicazione programmata è attiva.</p><div class="source"><span>Fonte ufficiale FIN · Stagione 2026/27</span><a href="${e(data.sourceUrl)}" target="_blank" rel="noopener noreferrer">Verifica sul sito FIN ↗</a></div><button id="refresh-fin">Aggiorna da FIN</button>`;
}
function officialPanel(data, view) {
  const e = escapeText;
  const meta = `<p class="muted">Regular Season · Lettura FIN verificata: ${e(new Date(data.checkedAt).toLocaleString('it-IT'))}. Orario di pubblicazione FIN non disponibile. Controllo automatico ogni 15 minuti, se la pubblicazione programmata è attiva.</p><div class="source"><span>Fonte ufficiale FIN · Stagione 2026/27</span><a href="${e(data.sourceUrl)}" target="_blank" rel="noopener noreferrer">Verifica sul sito FIN ↗</a></div><button id="refresh-fin">Aggiorna da FIN</button>`;
  if (view === 'squadre') return `<ul class="team-list">${data.teams.map(t => `<li><strong>${teamLink(t.id, t.name)}</strong></li>`).join('')}</ul>` + meta;
  if (view === 'classifica') {
    const headers = ['Squadra', 'Punti', 'Penalità', 'G', 'V', 'N', 'P', 'GF', 'GS', 'DR'];
    const fields = ['name', 'points', 'penalty', 'played', 'won', 'drawn', 'lost', 'goalsFor', 'goalsAgainst', 'goalDifference'];
    return `<p class="muted">Ordine e punti riportati dalla FIN, senza ricalcoli. G: giocate; V/N/P: vinte, pareggiate, perse; GF/GS: gol fatti e subiti; DR: differenza reti.</p><div class="table-scroll" role="region" aria-label="Classifica FIN, scorrimento orizzontale" tabindex="0"><table><caption>Classifica FIN · Regular Season 2026/27</caption><thead><tr>${headers.map(h => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${data.standings.map(t => `<tr>${fields.map((f, i) => i === 0 ? `<th scope="row">${teamLink(t.teamId, t.name)}</th>` : `<td>${e(t[f])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` + meta;
  }
  const games = view === 'risultati' ? data.results : data.fixtures;
  return `<div class="round-picker"><label for="fin-round">Giornata</label><select id="fin-round">${data.rounds.map(r => `<option value="${r}" ${r === data.round ? 'selected' : ''}>${r}</option>`).join('')}</select></div><p class="muted">${view === 'risultati' ? 'Solo incontri indicati come disputati dalla FIN.' : 'Tutti gli incontri della giornata. Date e orari come pubblicati dalla FIN.'}</p>${games.length ? `<ul class="match-list">${games.map(g => `<li><div><strong>${e(g.homeName)}</strong><span>${e(g.awayName)}</span></div><div class="match-score"><strong>${g.status === 'disputata' ? `${g.homeScore} – ${g.awayScore}` : '—'}</strong><small>${e(g.status)}</small></div><p class="muted">${e(g.dateLabel || 'Data non disponibile')}</p></li>`).join('')}</ul>` : empty('Nessun incontro indicato come disputato dalla FIN per questa giornata.')} ${meta}`;
}
function route() {
  const [section = 'campionati', leagueId, view, teamId, origin] = location.hash.slice(1).split('/');
  let decodedTeamId = '';
  try { decodedTeamId = decodeURIComponent(teamId || ''); } catch { /* Invalid URL: show the unavailable state. */ }
  return {
    section: Object.hasOwn(sections, section) ? section : 'campionati',
    leagueId: championships.some(c => c.id === leagueId) ? leagueId : championships[0].id,
    teamId: decodedTeamId, isTeam: view === 'scheda', returnView: section === 'classifiche' || origin === 'classifica' ? 'classifica' : 'squadre',
    view: Object.hasOwn(views, view) ? view : 'squadre',
  };
}
function navigate(section, leagueId, view) {
  location.hash = `${section}/${leagueId}/${view}`;
}
function picker(state) {
  return `<div class="league-picker" role="group" aria-label="Seleziona campionato">${championships.map(c => `<button class="league" data-league="${c.id}" aria-pressed="${state.leagueId === c.id}"><span class="league-icon" aria-hidden="true">${e(c.name.split(" ")[1] || "PN")}</span><span><strong>${c.name}</strong><small>Stagione ${c.season}</small></span><span class="check" aria-hidden="true">${state.leagueId === c.id ? '✓' : '→'}</span></button>`).join('')}</div>`;
}
async function render() {
  const currentRender = ++renderId;
  const state = route();
  document.querySelectorAll('[data-tab]').forEach(link => {
    const active = link.dataset.tab === state.section;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
  const browsing = ['campionati', 'partite', 'classifiche', 'squadre'].includes(state.section);
  content.innerHTML = `<div class="heading"><div><h2>${sections[state.section]}</h2><p class="muted">${browsing ? 'Segui la pallanuoto italiana, campionato per campionato.' : state.section === 'giocatori' ? 'Protagonisti, rose e statistiche della pallanuoto italiana.' : 'Uno spazio per le squadre e i campionati che segui.'}</p></div><span class="tag">2026/27</span></div>`;
  if (!browsing) {
    content.insertAdjacentHTML('beforeend', empty(state.section === 'giocatori' ? 'Profili, marcatori e statistiche saranno disponibili quando saranno integrati i dati ufficiali FIN.' : 'La funzione per salvare squadre e competizioni è in preparazione. Nessun preferito è stato salvato.'));
    return;
  }
  if (state.isTeam) {
    content.insertAdjacentHTML('beforeend', '<div id="league-panel" aria-live="polite" aria-busy="true"><div class="team-loading"><p class="muted">Caricamento della scheda FIN…</p></div></div>');
    const panel = document.getElementById('league-panel');
    try {
      const data = await getChampionship(state.leagueId, 'scheda', selectedRound, state.teamId || '');
      if (currentRender !== renderId) return;
      panel.innerHTML = data.status === 'available' && data.team ? teamPanel(data, state) : empty('Scheda squadra non disponibile per questo campionato.');
      document.getElementById('refresh-fin')?.addEventListener('click', render);
      document.getElementById('fin-round')?.addEventListener('change', event => { selectedRound = Number(event.target.value); render(); });
      panel.querySelectorAll('[data-jump]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); document.getElementById(link.dataset.jump)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    } catch {
      if (currentRender !== renderId) return;
      panel.innerHTML = `<a class="back-link" href="#${state.section}/${state.leagueId}/${state.returnView}">← Torna al campionato</a><div class="empty"><h3>Scheda non disponibile</h3><p class="muted">La squadra non è presente nei dati FIN oppure il collegamento non è verificabile al momento. Nessun dato sostitutivo viene mostrato.</p><button id="retry">Riprova</button></div>`;
      document.getElementById('retry').addEventListener('click', render);
    }
    if (currentRender === renderId) panel.setAttribute('aria-busy', 'false');
    return;
  }
  content.insertAdjacentHTML('beforeend', picker(state));
  content.querySelectorAll('[data-league]').forEach(button => button.addEventListener('click', () => navigate(state.section, button.dataset.league, state.view)));
  const league = championships.find(c => c.id === state.leagueId);
  const selectedView = state.section === 'classifiche' ? 'classifica' : state.section === 'squadre' ? 'squadre' : state.section === 'partite' && !['calendario', 'risultati'].includes(state.view) ? 'calendario' : state.view;
  const availableViews = state.section === 'campionati' ? Object.keys(views) : state.section === 'partite' ? ['calendario', 'risultati'] : [selectedView];
  content.insertAdjacentHTML('beforeend', `<div class="detail-title"><h3>${league.name}</h3><span>Stagione ${league.season}</span></div><div class="tabs" role="tablist" aria-label="Sezioni ${league.name}">${availableViews.map(key => `<button role="tab" id="tab-${key}" aria-controls="league-panel" aria-selected="${selectedView === key}" tabindex="${selectedView === key ? 0 : -1}" data-view="${key}">${views[key]}</button>`).join('')}</div><div id="league-panel" role="tabpanel" tabindex="0" aria-labelledby="tab-${selectedView}" aria-busy="true"><p class="muted">Caricamento…</p></div>`);
  const tabs = [...content.querySelectorAll('[data-view]')];
  tabs.forEach(button => {
    button.addEventListener('click', () => navigate(state.section, state.leagueId, button.dataset.view));
    button.addEventListener('keydown', event => {
      const index = tabs.indexOf(button);
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      tabs.forEach(tab => tab.tabIndex = -1);
      tabs[next].tabIndex = 0;
      tabs[next].focus();
    });
  });
  try {
    const data = await getChampionship(state.leagueId, selectedView, selectedRound);
    if (currentRender !== renderId) return;
    document.getElementById('league-panel').innerHTML = data.status === 'available'
      ? officialPanel(data, selectedView) : empty(descriptions[selectedView]) + source();
    document.getElementById('refresh-fin')?.addEventListener('click', render);
    document.getElementById('fin-round')?.addEventListener('change', event => { selectedRound = Number(event.target.value); render(); });
  } catch {
    if (currentRender !== renderId) return;
    document.getElementById('league-panel').innerHTML = '<div class="empty"><h3>Impossibile caricare i dati</h3><p class="muted">Il collegamento FIN non è verificabile al momento. Nessun dato sostitutivo viene mostrato. Riprova oppure consulta il sito ufficiale FIN.</p><a href="https://www.federnuoto.it/home/pallanuoto/campionato-a1-maschile/2026-2027-pn-m/regular-season-pn-m-2026-2027.html" target="_blank" rel="noopener noreferrer">Consulta FIN ↗</a><button id="retry">Riprova</button></div>';
    document.getElementById('retry').addEventListener('click', render);
  }
  if (currentRender === renderId) document.getElementById('league-panel').setAttribute('aria-busy', 'false');
}
window.addEventListener('hashchange', () => {
  const focused = document.activeElement;
  const restoreTab = focused?.matches('[data-view]');
  const restoreLeague = focused?.matches('[data-league]');
  render();
  if (restoreTab) content.querySelector('[role="tab"][aria-selected="true"]')?.focus();
  if (restoreLeague) content.querySelector('[data-league][aria-pressed="true"]')?.focus();
});
render();

setInterval(() => {
  if (!document.hidden && route().leagueId === 'a1-maschile-2026-27' && ['campionati', 'partite', 'classifiche', 'squadre'].includes(route().section)) render();
}, 900000);
