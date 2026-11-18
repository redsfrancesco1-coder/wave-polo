# Fonte ufficiale FIN — Serie A1 maschile 2026/27

WAVE POLO legge la Regular Season ufficiale da:
https://www.federnuoto.it/home/pallanuoto/campionato-a1-maschile/2026-2027-pn-m/regular-season-pn-m-2026-2027.html

Il server Netlify espone `GET /api/fin/a1-maschile-2026-27?view=risultati&round=1`. Le viste ammesse sono `squadre`, `calendario`, `risultati`, `classifica`. Legge la pagina FIN, verifica il titolo di competizione e stagione, ricava gli identificativi effettivi di evento/fase/girone e le giornate, quindi interroga lo stesso endpoint pubblico `com_solrconnect` usato dal sito FIN. Non usa API private, login, Google Apps Script o servizi dati a pagamento. Gli identificativi non sono fissati nel codice. L'User-Agent identifica il lettore WAVE POLO; le richieste Node senza identificazione hanno restituito 503 durante la verifica.

Il client controlla i dati quando si apre una vista, quando si preme Aggiorna e ogni cinque minuti mentre la pagina è visibile. Le risposte valide possono essere riutilizzate dalla CDN Netlify per cinque minuti; gli errori non sono memorizzati. Non è una sincronizzazione in background a sito chiuso e non promette un servizio live. Non occorre un database: i dati sono letti dalla fonte, senza copie persistenti. I consumi rientrano nelle quote Netlify disponibili: l'assenza di abbonamenti esterni non significa traffico illimitato gratuito.

La classifica conserva ordine, punti, penalità e statistiche della FIN: nessun ricalcolo da regole presunte. Squadre e classifica derivano dalla stessa tabella ufficiale. Calendario e risultati hanno un selettore per tutte le giornate esposte dalla pagina; la giornata iniziale è la prima. I punteggi sono esposti soltanto con `data-status="disputata"`; gli zeri segnaposto delle partite previste restano null. Date e orari sono riportati come testo FIN, senza dedurre anno o fuso orario mancanti. Nessun dato di una stagione diversa viene usato come ripiego.

`checkedAt` indica la lettura riuscita, non l'aggiornamento editoriale FIN, che non è esposto (`updatedAt: null`). La vista femminile resta esplicitamente in attesa. Il precedente adapter Sheets è conservato ma non è più importato né utilizzato nelle viste ufficiali.

## Verifica del 17 novembre 2026

Il test di integrazione reale `FIN_LIVE_TEST=1 npm test` ha letto con successo la pagina e le risposte FIN: 14 squadre, 26 giornate, 7 incontri nella prima giornata, dei quali 5 marcati disputati. Esempio letto: CC ORTIGIA 1928 – DE AKKER BOLOGNA 14–12. La prima riga della classifica era AN BRESCIA TEAM con 21 punti. Queste sono osservazioni della verifica, non dati usati per popolare l'app.

I test verificano anche il rifiuto di stagioni diverse, colonne modificate, identificativi mancanti, risposte vuote e parametri non validi. Non verificano l'omologazione sportiva oltre a quanto pubblica FIN. L'integrazione usa l'interfaccia web pubblica del sito, non un'API con garanzia di stabilità: se FIN cambia struttura o blocca l'accesso, l'app mostra un errore con collegamento ufficiale e non inventa dati. La copertura riguarda la Regular Season; eventuali playoff richiedono un'integrazione dedicata. Nessun accordo di redistribuzione o SLA è implicato dalla lettura pubblica.

È stato verificato anche l'endpoint attraverso `netlify dev --port 8889`: HTTP 200 per squadre, classifica, risultati della giornata 8 e calendario della giornata 26. Le giornate 8 e 26 non esponevano incontri disputati al momento del controllo. Una risposta FIN 503 simulata ha prodotto HTTP 502, cache disabilitata e nessun dato sportivo sostitutivo. Non è stata eseguita una verifica visiva con browser né un deploy di produzione.

## Cartella di pubblicazione

I file destinati al browser risiedono in `public/` (pagina iniziale, `assets/` e adapter `data/championships.js`). Netlify pubblica soltanto questa directory; il codice server, i test, la documentazione e le dipendenze rimangono all'esterno. Gli URL pubblici e il percorso `/api/fin/` sono invariati.
