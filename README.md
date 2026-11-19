# BauPatrimonio — app web gratuita

Taccuino personale del patrimonio, in italiano: **quanto possiedo, quanto devo e cosa è cambiato**. React 19, TypeScript, Vite, PWA, font locali e Decimal.js. Non dispone pagamenti e non invia ordini di investimento.

## Zero abbonamenti, nessun servizio obbligatorio

La modalità locale non richiede servizi esterni. La modalità online opzionale usa il tuo progetto Supabase: va configurato una volta nel browser da Profilo, senza installare Node.js. Nessun analytics, font remoto o API a pagamento. Le chiavi bancarie e le chiavi Supabase privilegiate non vanno nel client. In localStorage rimangono solo preferenze e configurazione pubblica del progetto; token Auth solo in memoria.

**Online:** da ciascun dispositivo accedi allo stesso progetto e utente, poi apri l’archivio online. Le modifiche successive sono salvate sul cloud con revisioni atomiche; nessuna fusione o sincronizzazione realtime. A ogni ricaricamento occorre accedere e aprire il cloud prima di modificare. In modalità locale i browser restano indipendenti. Nessun progetto remoto o abbonamento è stato attivato dall’agente.

➡ **Guida utente passo passo:** apri `public/GUIDA.html` oppure **Profilo → Guida passo passo** nell'app. È disponibile anche offline nella build di produzione.

## Uso online: nessuna installazione di Node.js

**GitHub Pages attivo**, verificato tramite API GitHub il 19 novembre 2026 (`status: built`, branch corrente `/docs`). Apri **https://sylarpower.github.io/BauPatrimonio/**. I nuovi push aggiornano il sito dopo il completamento del build Pages. Il codice e i dati di esempio sono pubblici, i tuoi dati personali non vengono pubblicati nel repository: restano nel browser oppure nel tuo Supabase privato se lo configuri. Apri la guida da **Profilo → Guida passo passo**. Su Chrome puoi installare l’app; su Safari usa Condividi → Aggiungi alla schermata Home. Dopo la prima apertura completa funziona anche offline.

### Pubblicazione per il manutentore

La build statica è in `docs/`, generata con `npm run prepare:pages`; il manifesto `.pages-files.json` permette di aggiornare soltanto gli artefatti senza cancellare la documentazione sorgente. Nessun workflow privilegiato è necessario. La configurazione Pages da selezionare è **Deploy from a branch → arena/dcc936f9-baupatrimonio → /docs** per questa pubblicazione; dopo un eventuale merge si può scegliere `main /docs`. Questo non pubblica il database locale o backup.

I comandi Node sono esclusivamente per chi sviluppa/manutiene, non per chi usa l’app:

```sh
npm ci
npm run dev             # sviluppo
npm run prepare:pages   # genera docs/ con base /BauPatrimonio/
```

Il modello Actions in `docs/pages-workflow.yml.example` resta un’alternativa facoltativa non installata: la connessione non ha permessi di modifica dei workflow. Non attivare piani a pagamento, runner speciali o upgrade. Lo stato effettivo della pubblicazione va verificato nella pagina Settings → Pages, non dedotto dalla presenza dei file.

## Funziona subito

- Copertina, archivio personale vuoto e demo **separata**, quattro sezioni, Chiaro/AMOLED ricordato prima del rendering, barra mobile, modali con focus trap.
- Tutte le categorie principali, quote indipendenti per beni e debiti, pensione distinta dalla liquidità, categoria personalizzata/natura delle altre attività.
- Primo conto in pochi campi: nome, saldo, valuta, data. Disponibilità e vincoli informativi non si sommano al saldo contabile. Valore sconosciuto inseribile esplicitamente e segnalato come mancante, mai presunto zero.
- Rilevazioni datate/versionate, originali e cambi verso EUR con fonte/data, storico, confronti per data, archiviazione senza cancellare il passato.
- Dossier aggregato oppure strumenti con ISIN facoltativo, quantità e prezzi decimali, fonte/data. Conferma di riconciliazione: il dettaglio **sostituisce** l'aggregato.
- Registrazione contabile di trasferimenti, acquisti/vendite **già eseguiti** e rimborsi capitale, con costi/interessi separati e applicazione della quota del dossier/debito. Operazioni abbinate limitate a EUR, con conto di liquidità al 100%.
- CSV saldi, posizioni e movimenti con mapping, separatori, importi/date italiani, anteprima, errori, duplicati e conferma dei casi ambigui. Gli strumenti sono conservati se sono abbinate descrizione/nome, quantità e prezzo; senza questi campi si conserva il totale per data.
- Privacy visiva, CSV riepilogo, backup/ripristino JSON validato, eliminazione con conferma testuale.
- PWA con manifest/icone e precache versionata di soli file statici. Nessuna risposta finanziaria privata, file importato o token nel service worker.

## Insight: più formati, non più rumore

Due visualizzazioni principali e un approfondimento espandibile, non dieci grafici in competizione.

### Investimenti e rendimento

Selettore **Tutto il patrimonio / Investimenti**. Il filtro riguarda tutti i grafici, confronti e qualità senza duplicare dettagli del dossier. Investimenti aggregati, esclusi pensione e liquidità. Il patrimonio totale nella scheda principale resta distinto e non viene filtrato.

Il pannello rendimento usa **Modified Dietz**, non annualizzato: risultato = finale − iniziale − flussi netti; percentuale sul capitale ponderato per giorni, flussi a fine giornata. Solo quota posseduta e flussi EUR. Richiede valutazioni esatte nelle due date, movimenti classificati e conferma esplicita dell’utente sulla completezza. Non è un rendimento certificato/fiscale o una semplice variazione del patrimonio. Acquisti/vendite nuovi includono i costi; movimenti storici/importati richiedono classificazione. I proventi distribuiti fuori dagli investimenti sono uscite negative; fra investimenti i flussi netti si compensano. Cambi di proprietà non registrati invalidano la conferma. Date/valori mancanti o archiviazioni nel periodo bloccano il calcolo; capitale ponderato non positivo non produce una percentuale. I flussi aggiunti a questo scopo non cambiano i saldi e sono correggibili.

### Andamento

- **Gradini** (predefinito), **Linee** oppure **Colonne**.
- Patrimonio netto oppure **Attività e debiti** come serie distinte.
- Periodi 1M, 3M, 6M, 1A, Tutto, distanze sull'asse X proporzionali alle **date effettive**.
- Un solo dato rimane un punto; nessun riempimento giornaliero o curva inventata. I gradini riportano il valore noto fino alla successiva rilevazione; le linee sono dichiarate guide visive, non quotazioni intermedie.
- Punti parziali vuoti/non collegati, dettaglio delle voci mancanti. Tocca o usa Tab e frecce/Home/End. Readout persistente e tabella alternativa.

### Composizione

- **Anello**, **Barre**, **Tabella**.
- Raggruppamento per categoria, istituto o natura/liquidabilità.
- Quote applicate, debiti esclusi dal denominatore attività, importi e percentuali su attività **note**. Previdenza sempre distinta dal denaro disponibile.

### Confronto e qualità

- **Cascata**, **Variazioni per voce**, **Tabella** tra date scelte.
- La cascata non viene disegnata se i dati di una delle date sono parziali. Non trasformiamo un valore sconosciuto in una variazione negativa/positiva.
- Nei portafogli grandi, la cascata mostra le sette variazioni più grandi e aggrega le altre; tabella e CSV mantengono tutto il dettaglio.
- Copertura dei dati, rilevazioni oltre 90 giorni, rapporto debiti/attività con limitazioni esplicite. Il rapporto non è consulenza né una misura della sostenibilità delle rate.
- **SVG** vettoriale, **PNG** 2×, **CSV** dei dati. Colori coerenti con il tema corrente, legenda/etichette per leggere il file esportato. In modalità Tabella si esporta CSV; quando gli importi sono nascosti nessun export dell'insight è disponibile.

Per provare tutte le viste: demo → **Prova i grafici con sei mesi di storico dimostrativo**. È un'azione opt-in nell'archivio demo, chiaramente fittizio; non inventa lo storico del patrimonio personale. I totali attuali restano quelli dello scenario richiesto.

## Regole contabili e limiti

- Attività di competenza − capitale residuo di competenza. La quota della casa non imposta quella del mutuo.
- Demo: conto 12.000, liquidità broker 2.000, ETF 8.000, pensione 20.000, casa 240.000 × 50%, auto 10.000, mutuo 120.000 × 50% → **attività 172.000, debiti 60.000, netto 112.000 EUR**.
- Trasferire 1.000 tra conto e broker non cambia il netto. Acquistare un ETF a prezzi invariati non crea patrimonio; commissioni e interessi lo riducono. Il rimborso del solo capitale riduce sia conto sia debito.
- Rilevazione valida: ultima non successiva alla data scelta. Nuove stime non riscrivono il mese precedente. Versioni nella stessa data: vale l'ultima inserita, le precedenti restano nel registro. Non è uno storico intragiornaliero.
- Importi, quantità e cambi sono stringhe decimali, calcoli con Decimal.js a precisione 40. Conversioni conservano il verso **EUR per 1 unità originale**, data e fonte. Un cambio non può avere data successiva alla rilevazione.
- Senza valore/cambio: **Totale parziale**, voci mancanti elencate. Prima della prima rilevazione non si assume zero.
- Archiviare una voce termina il contributo da quella data, non cancella lo storico e non inventa la liquidità di una vendita.
- Movimenti CSV non modificano automaticamente le valutazioni. Un saldo non è un versamento. Contributi pensionistici, TFR, disponibilità e prezzo d'acquisto sono informativi, non attività aggiuntive.
- Il dettaglio di un dossier riconcilia il suo aggregato. Il raggruppamento per istituto non scopre se l'utente registra due volte lo stesso bene in voci diverse: non aggiungere «broker totale» insieme alle sue sottovoci.
- **Riferimento EUR** in questa versione; originali EUR/USD/GBP/CHF/JPY/CAD con cambio manuale. Non ancora selezionabile una diversa valuta di riferimento.
- Nessun rendimento TWR/IRR, prezzo/cambio live, attribuzione automatica separata di mercato/cambi/flussi, PDF/XLSX, piano di ammortamento, rate automatiche o pagamenti/ordini. I collegamenti tra beni e finanziamenti sono informativi.
- Strumenti nella stessa valuta del dossier; una registrazione contabile di acquisto/vendita crea una nuova rilevazione aggregata. Riconcilia il dettaglio strumenti se lo aggiorni in seguito.

## File CSV e idempotenza

Esempi in `public/examples/`, scaricabili da Fonti e dalla guida. **Sono tracciati BauPatrimonio, non formati ufficiali delle banche.**

- Crea prima la voce destinataria; scegli saldi/posizioni oppure movimenti.
- File UTF-8 fino a 2 MB, data `AAAA-MM-GG` o `GG/MM/AAAA`, importi `1.234,56` oppure `1234.56`, valuta opzionale EUR. Con separatore virgola, racchiudi normalmente i decimali con virgola tra virgolette CSV. Un punto isolato è decimale, non separatore delle migliaia.
- Per i debiti usa capitale residuo positivo; un conto scoperto va rappresentato come passività. Le posizioni vanno in una voce Investimenti; non includere totali insieme ai componenti.
- Se mappi quantità e prezzo, `quantità × prezzo` deve riconciliare l'eventuale importo della riga entro mezzo centesimo; altrimenti la riga è esclusa. Valute diverse nello stesso gruppo/data non vengono sommate senza cambio.
- Lo stesso contenuto/conto/percorso è riconosciuto con SHA-256. Con ID operazione, identità conto + percorso + ID, anche su file diversi.
- Senza ID, identità file + numero riga. Due operazioni legittime con stessa data/importo **non** vengono collassate; i casi dubbi sono esclusi finché l'utente non conferma esplicitamente che sono distinti.
- Rilevazioni già presenti alla stessa data non vengono sovrascritte dal CSV. Aggiornale dal dettaglio con una nuova versione consapevole.
- Non è una deduplicazione bancaria universale: file modificati arbitrariamente o esportazioni parzialmente sovrapposte richiedono verifica dell'anteprima. Il file originale non viene conservato, solo dati confermati e registro importazione.
- Valuta estera senza cambio → totale parziale; registra dal dettaglio la valutazione con il cambio pertinente.

## Banche e sandbox: stato effettivo

**Nessun connettore bancario è attivo o testato in sandbox.** Verifica documentale aggiornata al 19 novembre 2026: Fideuram dispone di un percorso AIS tramite CBI Globe ed è citata nella documentazione Enable Banking per l’Italia. Trade Republic documenta conti, saldi e movimenti e il provider include clienti italiani; i movimenti risultano limitati a importo, valuta e data, senza descrizioni. **Le posizioni titoli/ETF e la previdenza non risultano coperte dalle API AIS consultate.**

I termini Enable Banking prevedono uso gratuito personale limitato ai propri Linked Accounts, modalità restricted. Richiede registrazione personale, app, consensi e un backend riservato per la chiave privata: GitHub Pages da solo non può sincronizzare le banche. Non sono stati attivati conti o servizi, accettati contratti o acquistati abbonamenti. Fonti, limiti, condizioni e passi mancanti in [`docs/COLLEGAMENTI.md`](docs/COLLEGAMENTI.md), anche nell’interfaccia Fonti.

## Architettura e riservatezza

Frontend statico pubblico con modalità locale e collegamento opzionale a Supabase Auth/PostgREST. La separazione locale demo/personale **non** separa persone che usano lo stesso profilo browser. La copia locale rimane anche dopo la disconnessione dal cloud: usa dispositivi fidati.

Lo schema `supabase/migrations/202611190001_initial.sql` è collegato al client opzionale: JSONB per proprietario, revisioni, RLS e RPC atomica SECURITY INVOKER. Lo schema è stato testato su PostgreSQL/PGlite con due utenti; il client REST è coperto da test mock, **non collaudato contro un progetto Supabase reale**. Guida completa in `public/GUIDA.html#cloud`: progetto Free dedicato (non modificare BauSplit), SQL Editor, utente Auth, Project URL e chiave pubblica publishable/anon, accesso dall’app. La connessione Supabase di Arena non è attiva.

Il piano Free può sospendere progetti inattivi e impone limiti: consultare https://supabase.com/pricing prima dell’attivazione. Non attivare upgrade/add-on, non superare i progetti attivi disponibili. Nessuna promessa di disponibilità continua o backup gestito gratuito.

Il token Auth e la password non sono persistiti. Dopo login occorre scegliere esplicitamente apertura del cloud o primo salvataggio (solo se remoto vuoto). Le scritture sono serializzate e verificano la revisione; un conflitto ferma il cloud senza sovrascrivere la copia remota. Errori/rete assente lasciano i dati locali e mostrano un avviso; niente retry invisibile o unione automatica. Rileggere il cloud sostituisce le modifiche locali. Le API sono sempre `no-store`, fuori dal service worker. Non inserire `service_role`, chiavi secret o chiavi bancarie nel browser. L’archivio Supabase non è ancora un backend bancario: nessun connettore AIS o token bancario è implementato.

La PWA cache-a esclusivamente file statici di build, guida e CSV di esempio; gli archivi finanziari sono dati applicativi espliciti IndexedDB, non cache HTTP. Le cache di altre app sullo stesso dominio non vengono eliminate. Percorso/base e hash del contenuto versionano la shell offline.

Header consigliati per hosting sotto il tuo controllo: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Nessun estratto conto o backup deve essere pubblico. Non certificato WCAG, non verificato con dispositivi fisici o lettore di schermo reale; sono implementati etichette, focus, controlli di tastiera, importi non espressi soltanto dal colore e alternative tabellari.

## Backup ed eliminazione, manualmente

1. Profilo → **Scarica backup strutturato**. JSON contiene dati finanziari in chiaro: conservalo in un luogo privato.
2. Trasferiscilo tra i tuoi dispositivi tramite un mezzo sotto il tuo controllo.
3. Sul destinatario entra nello stesso tipo di archivio → **Ripristina backup JSON** → conferma sostituzione. Nessuna fusione automatica: conserva prima un backup della copia che stai sostituendo.
4. Se il cloud è aperto, le modifiche (incluso svuotamento e ripristino) vengono inviate anche al cloud; controlla gli errori. Se il cloud è scollegato, viene modificata soltanto la copia locale. Per eliminare l'archivio attuale: Profilo → **Elimina dati** → scrivi `ELIMINA`. Non modifica l'altro archivio. Eventuali backup devono essere eliminati separatamente. Nessuna promessa di cancellazione forense da dischi/backup.

## Test eseguiti e riproducibili, senza servizi

```sh
npm test                     # contabilità, insight, operazioni e validazione backup
npm run test:db              # PostgreSQL/PGlite, RLS tra due utenti (nessun server remoto)
npm run build
npx playwright install --with-deps chromium
BAU_TEST_PRODUCTION=1 npm run test:e2e
npm audit
```

Fallback Linux senza CDN browser:

```sh
BAU_TEST_PRODUCTION=1 BAU_USE_PACKAGED_CHROMIUM=1 npm run test:e2e
```

I test coprono demo 112k, primo conto e reload, nuove stime storiche, trasferimento, acquisto/vendita, capitale/interessi, archiviazione, dati mancanti/cambi, reimportazione, import strumenti, navigazione e insight in tutti i formati a **320, 390 e 1440 px** in Chiaro e AMOLED; tastiera, grafici parziali, export SVG/PNG/CSV, privacy ed esecuzione offline di produzione. Screenshot e download di test in `test-results/` ignorati da Git. Nessuna CI automatica su push/PR: per evitare consumo di servizi non richiesti i test si eseguono localmente. L'unico modello di workflow è il deploy Pages **opt-in**, da aggiungere manualmente con i propri permessi GitHub.

## Struttura principale

```text
src/App.tsx               sezioni, modali e archivio
src/model.ts              rilevazioni, precisione, quote, demo e trasferimenti
src/insights-model.ts      serie temporali, composizione, confronto e qualità
src/Insights.tsx           visualizzazioni accessibili e formati alternativi
src/chart-export.ts       SVG/PNG locali, nessun servizio di rendering
src/operations.ts          registrazioni abbinate, capitale e costi/interessi
src/Importer.tsx           CSV e strumenti con riconciliazione
src/Portfolio.tsx          strumenti manuali e riconciliazione dossier
src/validation.ts          validazione backup
public/GUIDA.html          istruzioni utente offline
scripts/build-sw.mjs      precache statica con percorso e hash di contenuto
supabase/                 schema server opzionale, non collegato al frontend
```
