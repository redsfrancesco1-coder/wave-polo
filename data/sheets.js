export const sheetUrl = 'https://docs.google.com/spreadsheets/d/1X11Kyf2dhpOiOO_v0__XOfpnjU0C-69HEVI4Y7NMhlI/edit';
const dataUrl = sheetUrl.replace('/edit', '/gviz/tq?tqx=out:json&sheet=Squadre&headers=1');

// Parse only JSON; never execute the JavaScript wrapper returned by Google.
export function parseTeams(response) {
  const match = response.match(/^\s*\/\*O_o\*\/\s*google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/);
  if (!match) throw new Error('Risposta Google Sheets non leggibile');
  const data = JSON.parse(match[1]);
  if (data.status !== 'ok' || !Array.isArray(data.table?.cols) || !Array.isArray(data.table?.rows)) {
    throw new Error('Dati Google Sheets non disponibili');
  }
  const columns = data.table.cols.map(col => String(col.label).trim().toLowerCase());
  if (!['name', 'city', 'competition', 'gender'].every(key => columns.includes(key))) {
    throw new Error('Colonne del foglio non riconosciute');
  }
  const value = (row, key) => {
    const cell = row.c?.[columns.indexOf(key)]?.v;
    return typeof cell === 'string' ? cell.trim() : '';
  };
  return data.table.rows
    .filter(row => value(row, 'competition') === 'Serie A1' && value(row, 'gender') === 'Men' && value(row, 'name'))
    .map(row => ({ name: value(row, 'name'), city: value(row, 'city') }));
}

export async function loadTeams() {
  const response = await fetch(dataUrl, {
    credentials: 'omit', cache: 'no-store', signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error('Foglio non accessibile');
  return parseTeams(await response.text());
}
